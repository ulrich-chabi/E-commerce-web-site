import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { LEGAL_PAGES } from "@/lib/legal"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = LEGAL_PAGES[(await params).slug]
  return { title: page?.title ?? "Page not found" }
}

export default async function LegalPage({ params }: Props) {
  const page = LEGAL_PAGES[(await params).slug]
  if (!page) notFound()
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-3xl">{page.title}</h1>
      <p className="mt-4 rounded-2xl border border-sand bg-white p-5">{page.placeholder}</p>
    </div>
  )
}
