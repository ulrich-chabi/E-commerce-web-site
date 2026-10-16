import { sdk } from "./medusa"

export type CatalogCard = {
  id: string
  handle: string
  title: string
  brand: string | null
  category_handle: string | null
  price_from: number
  currency_code: string
  offer_count: number
  vendor_count: number
  vendors: string[]
}
export type VendorFacet = { handle: string; name: string; count: number }
export type CatalogResponse = {
  catalog: CatalogCard[]
  count: number
  limit: number
  offset: number
  facets: { vendors: VendorFacet[] }
}
export type Offer = {
  product_id: string
  variant_id: string
  vendor_id: string
  vendor_name: string
  vendor_handle: string
  price: number
  currency_code: string
}
export type CatalogDetail = {
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
}
export type Category = { id: string; name: string; handle: string; rank: number | null }

export type CatalogParams = Partial<
  Record<"q" | "category" | "vendor" | "min_price" | "max_price" | "sort" | "limit" | "offset", string>
>

function toQuery(params: CatalogParams) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v)
  return qs.toString()
}

export async function fetchCatalog(params: CatalogParams) {
  return sdk.client.fetch<CatalogResponse>(`/store/catalog?${toQuery(params)}`)
}

export async function fetchProduct(handle: string): Promise<CatalogDetail | null> {
  try {
    const r = await sdk.client.fetch<{ product: CatalogDetail }>(`/store/catalog/${encodeURIComponent(handle)}`)
    return r.product
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null
    throw e
  }
}

export async function fetchCategories() {
  const r = await sdk.client.fetch<{ product_categories: Category[] }>(
    "/store/product-categories?limit=100&fields=id,name,handle,rank"
  )
  // Ordre voulu par le catalogue (rang), puis ordre alphabétique en cas d'égalité.
  return r.product_categories
    .slice()
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name))
}

type RawParams = Record<string, string | string[] | undefined>
const SORTS = ["relevance", "price_asc", "price_desc", "newest"]

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const num = (v: string | undefined) => (v && /^\d+(\.\d{1,2})?$/.test(v.trim()) ? v.trim() : undefined)

// Nettoie les paramètres d'URL : on n'envoie au backend que des valeurs valides.
export function cleanParams(raw: RawParams): CatalogParams {
  const sort = first(raw.sort)
  const offset = first(raw.offset)
  return {
    q: first(raw.q)?.trim().slice(0, 100) || undefined,
    vendor: first(raw.vendor)?.slice(0, 100) || undefined,
    min_price: num(first(raw.min_price)),
    max_price: num(first(raw.max_price)),
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    offset: offset && /^\d+$/.test(offset) ? offset : undefined,
  }
}
