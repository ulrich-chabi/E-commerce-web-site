import type { Metadata } from "next"
import Link from "next/link"
import { fetchCategories } from "@/lib/catalog"
import { tintFor } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "All departments" }

export default async function DepartmentsPage() {
  const categories = await fetchCategories()
  return (
    <div className="px-6 py-8 lg:px-10">
      <h1 className="font-serif text-3xl">All departments</h1>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => (
          <li key={c.id}>
            <Link href={`/categories/${c.handle}`} style={{ background: tintFor(c.handle) }} className="flex h-28 items-center justify-center rounded-2xl border border-sand p-3 text-center font-semibold text-ink no-underline">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
