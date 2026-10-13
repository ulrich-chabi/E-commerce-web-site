import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  createRemoteLinkStep,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateProductsWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import { MARKETPLACE_MODULE } from "../../modules/marketplace"
import { canTransition, HIDING_STATUSES } from "../../modules/marketplace/lifecycle"
import { VendorStatus } from "../../modules/marketplace/models/vendor"
import MarketplaceModuleService from "../../modules/marketplace/service"

export type SetVendorStatusInput = { vendor_id: string; status: VendorStatus }

// Lecture et validation, sans aucune écriture.
const planTransitionStep = createStep(
  "plan-vendor-transition",
  async (input: SetVendorStatusInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const {
      data: [vendor],
    } = await query.graph({
      entity: "vendor",
      fields: [
        "id", "handle", "name", "status",
        "stock_location.id",
        "products.id", "products.status", "products.metadata",
      ],
      filters: { id: input.vendor_id },
    })
    if (!vendor) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Vendeur introuvable.")

    const from = vendor.status as VendorStatus
    if (!canTransition(from, input.status)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Transition impossible : ${from} → ${input.status}.`
      )
    }

    const products = (vendor.products ?? []) as any[]
    const hide = HIDING_STATUSES.includes(input.status)
    const updates = hide
      ? products
          .filter((p) => p.status === "published")
          .map((p) => ({
            id: p.id,
            status: "draft" as const,
            metadata: { ...(p.metadata ?? {}), hidden_by_marketplace: true },
          }))
      : products
          .filter((p) => p.metadata?.hidden_by_marketplace === true)
          .map((p) => ({
            id: p.id,
            status: "published" as const,
            metadata: { ...(p.metadata ?? {}), hidden_by_marketplace: false },
          }))

    return new StepResponse({
      vendor_id: vendor.id as string,
      handle: vendor.handle as string,
      previous_status: from,
      needs_stock_location: input.status === "active" && !vendor.stock_location?.id,
      product_updates: updates,
    })
  }
)

const writeStatusStep = createStep(
  "write-vendor-status",
  async (
    data: { vendor_id: string; status: VendorStatus; previous_status: VendorStatus },
    { container }
  ) => {
    const service: MarketplaceModuleService = container.resolve(MARKETPLACE_MODULE)
    const vendor = await service.updateVendors({ id: data.vendor_id, status: data.status })
    return new StepResponse(vendor, data)
  },
  async (data, { container }) => {
    if (!data) return
    const service: MarketplaceModuleService = container.resolve(MARKETPLACE_MODULE)
    await service.updateVendors({ id: data.vendor_id, status: data.previous_status })
  }
)

const setVendorStatusWorkflow = createWorkflow(
  "set-vendor-status",
  (input: SetVendorStatusInput) => {
    const plan = planTransitionStep(input)

    when("provision-stock-location", { plan }, (d) => d.plan.needs_stock_location).then(() => {
      const { data: stores } = useQueryGraphStep({
        entity: "store",
        fields: ["default_sales_channel_id"],
      }).config({ name: "retrieve-store-for-location" })

      const locationInput = transform({ plan }, (d) => ({
        locations: [
          {
            name: `Vendor ${d.plan.handle}`,
            address: { city: "N/A", country_code: "US", address_1: "" },
          },
        ],
      }))
      const locations = createStockLocationsWorkflow.runAsStep({ input: locationInput })

      const salesChannelLink = transform({ locations, stores }, (d) => ({
        id: d.locations[0].id,
        add: [d.stores[0].default_sales_channel_id as string],
      }))
      linkSalesChannelsToStockLocationWorkflow.runAsStep({ input: salesChannelLink })

      const vendorLink = transform({ plan, locations }, (d) => [
        {
          [MARKETPLACE_MODULE]: { vendor_id: d.plan.vendor_id },
          [Modules.STOCK_LOCATION]: { stock_location_id: d.locations[0].id },
        },
      ])
      createRemoteLinkStep(vendorLink).config({ name: "link-vendor-stock-location" })
    })

    when("update-visible-products", { plan }, (d) => d.plan.product_updates.length > 0).then(() => {
      const productsInput = transform({ plan }, (d) => ({ products: d.plan.product_updates }))
      updateProductsWorkflow.runAsStep({ input: productsInput })
    })

    const vendor = writeStatusStep({
      vendor_id: plan.vendor_id,
      status: input.status,
      previous_status: plan.previous_status,
    })

    return new WorkflowResponse({ vendor, previous_status: plan.previous_status })
  }
)

export default setVendorStatusWorkflow
