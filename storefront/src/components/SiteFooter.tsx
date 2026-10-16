import Link from "next/link"
import { FOOTER_COLUMNS } from "@/lib/legal"

export function SiteFooter() {
  return (
    <footer className="mt-12 bg-ink px-6 py-8 text-cream lg:px-10">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {FOOTER_COLUMNS.map((col) => (
          <section key={col.title}>
            <h2 className="mb-2 text-base font-semibold">{col.title}</h2>
            <ul className="space-y-2">
              {col.links.map(([slug, label]) => (
                <li key={slug}><Link href={`/legal/${slug}`} className="text-cream">{label}</Link></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="my-6 text-sm">Language: English (US) · Country: United States · Currency: USD</p>
      <ul className="flex flex-wrap gap-6 border-t border-muted pt-4 text-sm">
        {[["terms", "Terms of use"], ["privacy", "Privacy notice"], ["ad-choices", "Your ad choices"], ["sponsored-results", "How sponsored results work"]].map(([slug, label]) => (
          <li key={slug}><Link href={`/legal/${slug}`} className="text-cream">{label}</Link></li>
        ))}
      </ul>
      <p className="mt-4 text-sm">&copy; [year] [owner]. Independent concept prototype, not affiliated with Amazon. All products and sellers are fictional.</p>
    </footer>
  )
}
