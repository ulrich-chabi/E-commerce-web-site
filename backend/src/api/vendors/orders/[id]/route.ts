import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { getVendorContext } from "../../guard"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { vendorId } = getVendorContext(req)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Filtre sur l'identifiant demandé ET sur le vendeur authentifié : la commande
  // d'un autre vendeur est indiscernable d'une commande inexistante (404).
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id", "display_id", "status", "email", "currency_code", "total", "subtotal",
      "metadata", "created_at", "items.*", "vendor.id",
    ],
    filters: { id: req.params.id },
  })
  const order = orders[0]

  if (!order || order.vendor?.id !== vendorId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Commande introuvable.")
  }
  res.json({ order })
}
