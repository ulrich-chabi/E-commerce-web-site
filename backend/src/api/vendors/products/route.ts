import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import createVendorProductWorkflow from "../../../workflows/marketplace/create-vendor-product"
import { getVendorContext } from "../guard"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { vendorId } = getVendorContext(req)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [vendor],
  } = await query.graph({
    entity: "vendor",
    fields: ["products.*", "products.variants.*"],
    filters: { id: vendorId },
  })

  res.json({ products: vendor?.products ?? [] })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminCreateProduct>,
  res: MedusaResponse
) => {
  const { vendorId } = getVendorContext(req)
  const { result } = await createVendorProductWorkflow(req.scope).run({
    input: { vendor_id: vendorId, product: req.validatedBody as any },
  })
  res.status(201).json({ product: result.product })
}
