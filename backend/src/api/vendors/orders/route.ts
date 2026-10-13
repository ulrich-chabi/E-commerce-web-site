import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getVendorContext } from "../guard"

const ORDER_FIELDS = [
  "id", "display_id", "status", "email", "currency_code", "total", "subtotal",
  "metadata", "created_at", "items.*",
]

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { vendorId } = getVendorContext(req)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [vendor],
  } = await query.graph({
    entity: "vendor",
    fields: ["orders.id"],
    filters: { id: vendorId },
  })

  const orderIds = (vendor?.orders ?? []).map((o: any) => o.id).filter(Boolean)

  // Aucune commande : liste vide. Ne jamais passer un filtre vide à la requête,
  // qui renverrait alors les commandes de tous les vendeurs.
  if (orderIds.length === 0) {
    return res.json({ orders: [] })
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    filters: { id: orderIds },
  })
  res.json({ orders })
}
