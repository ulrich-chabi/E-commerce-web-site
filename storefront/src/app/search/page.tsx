import type { Metadata } from "next"
import { ResultsView } from "@/components/ResultsView"
import { cleanParams, fetchCatalog, fetchCategories } from "@/lib/catalog"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Search" }

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const clean = cleanParams(await searchParams)
  const [categories, data] = await Promise.all([fetchCategories(), fetchCatalog(clean)])
  return (
    <ResultsView
      heading={clean.q ? `Results for “${clean.q}”` : "All products"}
      basePath="/search"
      params={clean}
      data={data}
      categories={categories}
    />
  )
}
