import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ResultsView } from "@/components/ResultsView"
import { cleanParams, fetchCatalog, fetchCategories } from "@/lib/catalog"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const category = (await fetchCategories()).find((c) => c.handle === handle)
  return { title: category?.name ?? "Department" }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { handle } = await params
  const categories = await fetchCategories()
  const category = categories.find((c) => c.handle === handle)
  if (!category) notFound()
  const clean = cleanParams(await searchParams)
  const data = await fetchCatalog({ ...clean, category: handle })
  return (
    <ResultsView
      heading={category.name}
      basePath={`/categories/${handle}`}
      params={clean}
      data={data}
      categories={categories}
      activeCategory={handle}
    />
  )
}
