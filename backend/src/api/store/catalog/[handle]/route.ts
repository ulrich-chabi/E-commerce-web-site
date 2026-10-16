import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { loadCatalog } from "../../../../modules/catalog/listing"

// Fiche détaillée : tous les produits visibles (offres) d'une fiche catalogue.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  // Filtre direct sur l'identifiant : ne dépend ni de l'ordre ni de la pagination.
  const { cards } = await loadCatalog(req.scope, { handle: req.params.handle, limit: 1 })
  const card = cards[0]
  if (!card) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Produit introuvable.")
  res.json({ product: card })
}
