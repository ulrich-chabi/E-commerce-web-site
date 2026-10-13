import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import createVendorOrdersWorkflow from "../../../../../workflows/marketplace/create-vendor-orders"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await createVendorOrdersWorkflow(req.scope).run({
    input: { cart_id: req.params.id },
  })
  res.json({ type: "order", order: result.order, vendor_orders: result.vendorOrders })
}
