import Link from "next/link"
import type { Category, CatalogParams, CatalogResponse } from "@/lib/catalog"
import { plural } from "@/lib/format"
import { ProductCard } from "./ProductCard"

const SORTS: [string, string][] = [
  ["relevance", "Relevance"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["newest", "Newest"],
]

function href(base: string, params: CatalogParams, patch: CatalogParams) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...params, ...patch })) if (v) qs.set(k, v)
  const s = qs.toString()
  return s ? `${base}?${s}` : base
}

export function ResultsView({
  heading, basePath, params, data, categories, activeCategory,
}: {
  heading: string
  basePath: string
  params: CatalogParams
  data: CatalogResponse
  categories: Category[]
  activeCategory?: string
}) {
  const limit = data.limit
  const page = Math.floor(data.offset / limit) + 1
  const pages = Math.max(1, Math.ceil(data.count / limit))
  const hasFilters = Boolean(params.vendor || params.min_price || params.max_price)

  return (
    <div className="grid gap-8 px-6 py-8 lg:grid-cols-[16rem_1fr] lg:px-10">
      <aside aria-label="Filters" className="self-start rounded-2xl border border-sand bg-white p-5">
        <form action={basePath} method="get" className="space-y-5">
          {params.q && <input type="hidden" name="q" value={params.q} />}
          <h2 className="text-lg font-semibold">Filters</h2>
          <div>
            <label htmlFor="vendor" className="mb-1 block font-semibold">Seller</label>
            <select id="vendor" name="vendor" defaultValue={params.vendor ?? ""} className="min-h-11 w-full rounded-xl border border-muted bg-white px-2">
              <option value="">All sellers</option>
              {data.facets.vendors.map((v) => (
                <option key={v.handle} value={v.handle}>{v.name} ({v.count})</option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="mb-1 font-semibold">Price (USD)</legend>
            <div className="flex items-center gap-2">
              <label htmlFor="min_price" className="sr-only">Minimum price</label>
              <input id="min_price" name="min_price" inputMode="decimal" defaultValue={params.min_price ?? ""} placeholder="Min" className="min-h-11 w-full rounded-xl border border-muted px-2" />
              <span aria-hidden="true">–</span>
              <label htmlFor="max_price" className="sr-only">Maximum price</label>
              <input id="max_price" name="max_price" inputMode="decimal" defaultValue={params.max_price ?? ""} placeholder="Max" className="min-h-11 w-full rounded-xl border border-muted px-2" />
            </div>
          </fieldset>
          <div>
            <label htmlFor="sort" className="mb-1 block font-semibold">Sort by</label>
            <select id="sort" name="sort" defaultValue={params.sort ?? "relevance"} className="min-h-11 w-full rounded-xl border border-muted bg-white px-2">
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="min-h-11 rounded-xl bg-terracotta px-5 text-white">Apply</button>
            {hasFilters && <Link href={href(basePath, { q: params.q }, {})} className="self-center">Clear filters</Link>}
          </div>
        </form>
        <nav aria-label="Departments" className="mt-6 border-t border-sand pt-4">
          <h2 className="mb-2 text-lg font-semibold">Departments</h2>
          <ul className="space-y-1">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categories/${c.handle}`} aria-current={c.handle === activeCategory ? "page" : undefined} className={c.handle === activeCategory ? "font-semibold" : ""}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <section aria-labelledby="results-heading">
        <h1 id="results-heading" className="font-serif text-3xl">{heading}</h1>
        <p className="mt-1 text-muted" aria-live="polite">
          {plural(data.count, "product", "products")}. Delivery and tax are shown before you place an order.
        </p>
        {data.catalog.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-sand bg-white p-6">
            <p className="font-semibold">No results.</p>
            <p className="text-muted">Try fewer filters or a different search.</p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {data.catalog.map((c) => <li key={c.id} className="flex"><div className="flex-1"><ProductCard card={c} /></div></li>)}
          </ul>
        )}
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex items-center gap-4">
            {page > 1 ? <Link href={href(basePath, params, { offset: String((page - 2) * limit) })}>Previous</Link> : <span className="text-muted">Previous</span>}
            <span>Page {page} of {pages}</span>
            {page < pages ? <Link href={href(basePath, params, { offset: String(page * limit) })}>Next</Link> : <span className="text-muted">Next</span>}
          </nav>
        )}
      </section>
    </div>
  )
}
