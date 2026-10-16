import Link from "next/link"
import { fetchCategories } from "@/lib/catalog"
import { Logo } from "./Logo"

export async function SiteHeader() {
  // Si le backend est indisponible, l'en-tête reste affiché sans les rayons.
  const categories = await fetchCategories().catch(() => [])
  return (
    <header>
      <div className="flex flex-wrap items-center gap-4 border-b border-sand bg-white px-6 py-4 lg:px-10">
        <Logo />
        <form action="/search" role="search" className="flex min-w-[16rem] flex-1 gap-2">
          <label htmlFor="site-search" className="sr-only">Search products</label>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Search products"
            className="min-h-11 flex-1 rounded-xl border border-muted bg-white px-3 text-base"
          />
          <button type="submit" className="min-h-11 rounded-xl bg-terracotta px-5 text-base text-white">Search</button>
        </form>
        <nav aria-label="Account and cart" className="flex gap-5">
          <Link href="/account">Account</Link>
          <Link href="/cart">Cart</Link>
        </nav>
      </div>
      <nav aria-label="Departments" className="flex gap-6 overflow-x-auto bg-sand-soft px-6 py-3 lg:px-10">
        <Link href="/departments" className="whitespace-nowrap">All departments</Link>
        {categories.slice(0, 8).map((c) => (
          <Link key={c.id} href={`/categories/${c.handle}`} className="whitespace-nowrap">{c.name}</Link>
        ))}
      </nav>
    </header>
  )
}
