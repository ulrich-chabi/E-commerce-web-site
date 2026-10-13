import {
  CartLineItemDTO,
  LinkDefinition,
  OrderDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  promiseAll,
} from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  cancelOrderWorkflow,
  completeCartWorkflow,
  createOrderWorkflow,
  createRemoteLinkStep,
  getOrderDetailWorkflow,
  releaseLockStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import vendorOrderLink from "../../links/vendor-order"
import { MARKETPLACE_MODULE } from "../../modules/marketplace"

type VendorItems = Record<string, CartLineItemDTO[]>

// Regroupe les lignes du panier par vendeur. Une ligne dont le produit n'a
// pas de vendeur fait échouer la commande : on ne perd jamais une ligne en silence.
const groupVendorItemsStep = createStep(
  "group-vendor-items",
  async ({ cart }: { cart: { items?: CartLineItemDTO[] } }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const vendorsItems: VendorItems = {}

    for (const item of cart.items || []) {
      const {
        data: [product],
      } = await query.graph({
        entity: "product",
        fields: ["id", "vendor.id", "vendor.status"],
        filters: { id: item.product_id || "" },
      })
      const vendorId = product?.vendor?.id
      if (!vendorId) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `La ligne "${item.title}" n'est rattachée à aucun vendeur.`
        )
      }
      if (product.vendor.status !== "active") {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Le vendeur de "${item.title}" ne vend plus actuellement.`
        )
      }
      vendorsItems[vendorId] = [...(vendorsItems[vendorId] || []), item]
    }

    return new StepResponse({ vendorsItems })
  }
)

const createVendorOrdersStep = createStep(
  "create-vendor-orders",
  async (
    { vendorsItems, parentOrder }: { vendorsItems: VendorItems; parentOrder: OrderDTO },
    { container, context }
  ) => {
    const linkDefs: LinkDefinition[] = []
    const created: { id: string; vendor_id: string }[] = []
    const vendorIds = Object.keys(vendorsItems)

    // Un seul vendeur : la commande client est directement sa commande.
    if (vendorIds.length === 1) {
      linkDefs.push({
        [MARKETPLACE_MODULE]: { vendor_id: vendorIds[0] },
        [Modules.ORDER]: { order_id: parentOrder.id },
      })
      return new StepResponse(
        { orders: [{ id: parentOrder.id, vendor_id: vendorIds[0] }], linkDefs },
        { created_order_ids: [] as string[] }
      )
    }

    try {
      for (const vendorId of vendorIds) {
        const { result } = (await createOrderWorkflow(container).run({
          input: {
            items: vendorsItems[vendorId],
            metadata: { parent_order_id: parentOrder.id, vendor_id: vendorId },
            region_id: parentOrder.region_id,
            customer_id: parentOrder.customer_id,
            sales_channel_id: parentOrder.sales_channel_id,
            email: parentOrder.email,
            currency_code: parentOrder.currency_code,
            shipping_address_id: parentOrder.shipping_address?.id,
            billing_address_id: parentOrder.billing_address?.id,
            // Les frais de livraison restent sur la commande client :
            // ils ne sont pas dupliqués sur chaque commande vendeur.
          },
          context,
        })) as unknown as { result: OrderDTO }

        created.push({ id: result.id, vendor_id: vendorId })
        linkDefs.push({
          [MARKETPLACE_MODULE]: { vendor_id: vendorId },
          [Modules.ORDER]: { order_id: result.id },
        })
      }
    } catch (e) {
      // Annule les commandes vendeur déjà créées avant de signaler l'échec.
      for (const o of created) {
        await cancelOrderWorkflow(container).run({
          input: { order_id: o.id },
          context,
        })
      }
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Création des commandes vendeur impossible : ${(e as Error).message}`
      )
    }

    return new StepResponse(
      { orders: created, linkDefs },
      { created_order_ids: created.map((o) => o.id) }
    )
  },
  async (data, { container, context }) => {
    if (!data) return
    for (const id of data.created_order_ids) {
      await cancelOrderWorkflow(container).run({ input: { order_id: id }, context })
    }
  }
)

const createVendorOrdersWorkflow = createWorkflow(
  "create-vendor-orders",
  (input: { cart_id: string }) => {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: ["id", "items.*"],
      filters: { id: input.cart_id },
      options: { throwIfKeyNotFound: true },
    })

    // Vérification AVANT de finaliser le panier : si une ligne n'a pas de vendeur,
    // aucune commande n'est créée.
    const { vendorsItems } = groupVendorItemsStep({ cart: carts[0] } as any)

    acquireLockStep({ key: input.cart_id, timeout: 2, ttl: 10 })

    const { id: orderId } = completeCartWorkflow.runAsStep({
      input: { id: carts[0].id },
    })

    const { data: existingLinks } = useQueryGraphStep({
      entity: vendorOrderLink.entryPoint,
      fields: ["vendor.id"],
      filters: { order_id: orderId },
    }).config({ name: "retrieve-existing-links" })

    const order = getOrderDetailWorkflow.runAsStep({
      input: {
        order_id: orderId,
        fields: [
          "region_id",
          "customer_id",
          "sales_channel_id",
          "email",
          "currency_code",
          "shipping_address.*",
          "billing_address.*",
        ],
      },
    })

    const vendorOrders = when(
      "create-vendor-order-links",
      { existingLinks },
      (d) => d.existingLinks.length === 0
    ).then(() => {
      const { orders, linkDefs } = createVendorOrdersStep({
        parentOrder: order,
        vendorsItems,
      })
      createRemoteLinkStep(linkDefs)
      return orders
    })

    releaseLockStep({ key: input.cart_id })

    return new WorkflowResponse({ order, vendorOrders })
  }
)

export default createVendorOrdersWorkflow
