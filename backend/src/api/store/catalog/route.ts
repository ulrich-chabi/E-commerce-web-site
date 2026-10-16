import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { loadCatalog } from "../../../modules/catalog/listing"

export const GetCatalogSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  vendor: z.string().max(100).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  sort: z.enum(["relevance", "price_asc", "price_desc", "newest"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

// Liste publique des fiches catalogue (offres des vendeurs actifs uniquement).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = GetCatalogSchema.safeParse(req.query)
  if (!parsed.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Paramètres de recherche invalides.")
  }
  const params = parsed.data
  const { cards, count, limit, offset, facets } = await loadCatalog(req.scope, params)
  res.json({
    catalog: cards.map(({ offers, ...c }) => ({
      ...c,
      // Les offres complètes sont réservées à la fiche détaillée.
      vendors: [...new Set(offers.map((o) => o.vendor_name))],
    })),
    count,
    limit,
    offset,
    facets,
  })
}
