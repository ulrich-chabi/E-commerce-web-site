import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, QueryContext } from "@medusajs/framework/utils"

export type Offer = {
  product_id: string
  variant_id: string
  vendor_id: string
  vendor_name: string
  vendor_handle: string
  price: number
  currency_code: string
}

export type CatalogCard = {
  id: string
  handle: string
  title: string
  brand: string | null
  description: string | null
  category_handle: string | null
  attributes: Record<string, unknown> | null
  offers: Offer[]
  price_from: number
  currency_code: string
  offer_count: number
  vendor_count: number
}

export type CatalogQuery = {
  handle?: string
  q?: string
  category?: string
  vendor?: string
  min_price?: number
  max_price?: number
  sort?: "relevance" | "price_asc" | "price_desc" | "newest"
  limit?: number
  offset?: number
}

// Région de vente : celle qui porte la devise demandée (USD par défaut).
async function regionFor(query: any, currency: string) {
  const { data } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code"],
    filters: { currency_code: currency },
  })
  return data[0] as { id: string; currency_code: string } | undefined
}

// Offres visibles : produits publiés d'un vendeur ACTIF, avec un prix calculé.
function toOffers(products: any[]): Offer[] {
  const offers: Offer[] = []
  for (const p of products ?? []) {
    if (p.status !== "published") continue
    if (p.vendor?.status !== "active") continue
    const prices = (p.variants ?? [])
      .map((v: any) => ({ v, amount: v.calculated_price?.calculated_amount }))
      .filter((x: any) => typeof x.amount === "number")
    if (prices.length === 0) continue
    const best = prices.reduce((a: any, b: any) => (b.amount < a.amount ? b : a))
    offers.push({
      product_id: p.id,
      variant_id: best.v.id,
      vendor_id: p.vendor.id,
      vendor_name: p.vendor.name,
      vendor_handle: p.vendor.handle,
      price: best.amount,
      currency_code: best.v.calculated_price.currency_code,
    })
  }
  return offers.sort((a, b) => a.price - b.price)
}

const PRODUCT_FIELDS = [
  "id", "status", "vendor.id", "vendor.name", "vendor.handle", "vendor.status",
  "variants.id", "variants.calculated_price.*",
]

export type VendorFacet = { handle: string; name: string; count: number }
export type CatalogPage = {
  cards: CatalogCard[]
  count: number
  limit: number
  offset: number
  facets: { vendors: VendorFacet[] }
}

export async function loadCatalog(
  container: MedusaContainer,
  q: CatalogQuery,
  currency = "usd"
): Promise<CatalogPage> {
  const query: any = container.resolve(ContainerRegistrationKeys.QUERY)
  const region = await regionFor(query, currency)
  if (!region) {
    return { cards: [], count: 0, limit: q.limit ?? 24, offset: q.offset ?? 0, facets: { vendors: [] } }
  }

  const filters: Record<string, unknown> = {}
  if (q.handle) filters.handle = q.handle
  if (q.category) filters.category_handle = q.category
  const text = q.q?.trim()
  if (text) {
    const like = `%${text.replace(/[%_]/g, "")}%`
    filters.$or = [{ title: { $ilike: like } }, { brand: { $ilike: like } }]
  }

  const { data } = await query.graph({
    entity: "catalog_product",
    fields: [
      "id", "handle", "title", "brand", "description", "category_handle", "attributes",
      "created_at", ...PRODUCT_FIELDS.map((f) => `products.${f}`),
    ],
    filters,
    context: {
      products: {
        variants: {
          calculated_price: QueryContext({ region_id: region.id, currency_code: currency }),
        },
      },
    },
  })

  let cards: (CatalogCard & { created_at: string })[] = (data as any[])
    .map((c) => {
      const offers = toOffers(c.products)
      return {
        id: c.id, handle: c.handle, title: c.title, brand: c.brand,
        description: c.description, category_handle: c.category_handle,
        attributes: c.attributes, created_at: c.created_at, offers,
        price_from: offers[0]?.price ?? 0,
        currency_code: offers[0]?.currency_code ?? currency,
        offer_count: offers.length,
        vendor_count: new Set(offers.map((o) => o.vendor_id)).size,
      }
    })
    .filter((c) => c.offer_count > 0) // une fiche sans offre visible n'est pas affichée

  // Vendeurs disponibles pour la sélection courante (avant le filtre vendeur).
  const vendorMap = new Map<string, VendorFacet>()
  for (const c of cards) {
    const seen = new Set<string>()
    for (const o of c.offers) {
      if (seen.has(o.vendor_handle)) continue
      seen.add(o.vendor_handle)
      const f = vendorMap.get(o.vendor_handle)
      if (f) f.count += 1
      else vendorMap.set(o.vendor_handle, { handle: o.vendor_handle, name: o.vendor_name, count: 1 })
    }
  }
  const vendorFacets = [...vendorMap.values()].sort((a, b) => a.name.localeCompare(b.name))

  if (q.vendor) {
    cards = cards
      .map((c) => ({ ...c, offers: c.offers.filter((o) => o.vendor_handle === q.vendor) }))
      .filter((c) => c.offers.length > 0)
      .map((c) => ({
        ...c, price_from: c.offers[0].price, offer_count: c.offers.length,
        vendor_count: new Set(c.offers.map((o) => o.vendor_id)).size,
      }))
  }
  if (q.min_price !== undefined) cards = cards.filter((c) => c.price_from >= q.min_price!)
  if (q.max_price !== undefined) cards = cards.filter((c) => c.price_from <= q.max_price!)

  const sort = q.sort ?? "relevance"
  if (sort === "price_asc") cards.sort((a, b) => a.price_from - b.price_from)
  else if (sort === "price_desc") cards.sort((a, b) => b.price_from - a.price_from)
  else if (sort === "newest")
    cards.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
  else if (text) {
    // Pertinence simple : titre qui commence par la recherche, puis titre qui la contient.
    const t = text.toLowerCase()
    const score = (c: CatalogCard) =>
      c.title.toLowerCase().startsWith(t) ? 0 : c.title.toLowerCase().includes(t) ? 1 : 2
    cards.sort((a, b) => score(a) - score(b) || a.title.localeCompare(b.title))
  } else cards.sort((a, b) => a.title.localeCompare(b.title))

  const count = cards.length
  const limit = Math.min(Math.max(q.limit ?? 24, 1), 100)
  const offset = Math.max(q.offset ?? 0, 0)
  return { cards: cards.slice(offset, offset + limit), count, limit, offset, facets: { vendors: vendorFacets } }
}
