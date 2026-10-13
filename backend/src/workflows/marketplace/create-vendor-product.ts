import { CreateProductWorkflowInputDTO } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  createProductsWorkflow,
  CreateProductsWorkflowInput,
  createRemoteLinkStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import { MARKETPLACE_MODULE } from "../../modules/marketplace"

type WorkflowInput = {
  vendor_id: string
  product: CreateProductWorkflowInputDTO
}

const createVendorProductWorkflow = createWorkflow(
  "create-vendor-product",
  (input: WorkflowInput) => {
    const { data: stores } = useQueryGraphStep({
      entity: "store",
      fields: ["default_sales_channel_id"],
    })

    const { data: profiles } = useQueryGraphStep({
      entity: "shipping_profile",
      fields: ["id"],
      filters: { type: "default" },
    }).config({ name: "retrieve-default-shipping-profile" })

    const productData = transform({ input, stores, profiles }, (d) => ({
      products: [
        {
          // Profil d'expédition par défaut si le vendeur n'en précise pas.
          shipping_profile_id: d.profiles[0]?.id,
          ...d.input.product,
          sales_channels: [{ id: d.stores[0].default_sales_channel_id }],
        },
      ],
    }))

    const createdProducts = createProductsWorkflow.runAsStep({
      input: productData as CreateProductsWorkflowInput,
    })

    const links = transform({ input, createdProducts }, (d) =>
      d.createdProducts.map((product) => ({
        [MARKETPLACE_MODULE]: { vendor_id: d.input.vendor_id },
        [Modules.PRODUCT]: { product_id: product.id },
      }))
    )
    createRemoteLinkStep(links)

    const { data: products } = useQueryGraphStep({
      entity: "product",
      fields: ["*", "variants.*"],
      filters: { id: createdProducts[0].id },
    }).config({ name: "retrieve-created-product" })

    return new WorkflowResponse({ product: products[0] })
  }
)

export default createVendorProductWorkflow
