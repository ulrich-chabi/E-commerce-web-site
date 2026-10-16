import Link from "next/link"
import { ProductCard } from "@/components/ProductCard"
import { fetchCatalog, fetchCategories } from "@/lib/catalog"
import { tintFor } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [categories, arrivals] = await Promise.all([
    fetchCategories(),
    fetchCatalog({ sort: "newest", limit: "5" }),
  ])
  return (
    <div className="px-6 py-8 lg:px-10">
      <section className="flex flex-col items-start gap-6 rounded-2xl bg-teal p-8 text-white lg:flex-row lg:items-center lg:p-10">
        <div className="flex-1">
          <h1 className="font-serif text-4xl lg:text-5xl">Find it. Compare it. Know the total.</h1>
          <p className="mt-3 text-lg">Prices, fees and delivery shown before you commit.</p>
          <Link href="/search" className="mt-5 inline-block rounded-xl bg-white px-5 py-3 text-ink no-underline">Start searching</Link>
        </div>
        <div aria-hidden="true" className="flex h-48 w-full items-center justify-center rounded-xl bg-sand text-muted lg:w-96">Hero image</div>
      </section>

      <ul className="mt-5 grid gap-5 md:grid-cols-3">
        {["Delivery date and total cost shown before checkout", "Returns policy shown on every offer", "Payment is simulated: no real charge"].map((t) => (
          <li key={t} className="rounded-2xl border border-sand bg-white p-5">{t}</li>
        ))}
      </ul>

      <section aria-labelledby="departments" className="mt-10">
        <h2 id="departments" className="mb-4 text-2xl font-semibold">Shop by department</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/categories/${c.handle}`}
                style={{ background: tintFor(c.handle) }}
                className="flex h-28 items-center justify-center rounded-2xl border border-sand p-3 text-center font-semibold text-ink no-underline"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="arrivals" className="mt-10">
        <h2 id="arrivals" className="mb-4 text-2xl font-semibold">New arrivals</h2>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {arrivals.catalog.map((c) => <li key={c.id} className="flex"><div className="flex-1"><ProductCard card={c} /></div></li>)}
        </ul>
      </section>

      <section aria-labelledby="sell" className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-sand p-6 md:flex-row md:items-center">
        <div>
          <h2 id="sell" className="text-2xl font-semibold">Sell with us</h2>
          <p>Open a seller account and manage offers, stock and orders in one place.</p>
        </div>
        <Link href="/legal/sell" className="rounded-xl bg-terracotta px-5 py-3 text-white no-underline">Become a seller</Link>
      </section>
    </div>
  )
}
