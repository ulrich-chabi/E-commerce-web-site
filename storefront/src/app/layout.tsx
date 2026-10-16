import type { Metadata } from "next"
import "./globals.css"
import { SiteFooter } from "@/components/SiteFooter"
import { SiteHeader } from "@/components/SiteHeader"
import { PUBLISHABLE_KEY } from "@/lib/medusa"

// Le site dépend du backend à chaque requête : pas de pré-génération statique.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { default: "Marketplace concept", template: "%s | Marketplace concept" },
  description: "Independent concept prototype of a multi-vendor marketplace. All products and sellers are fictional.",
  // Prototype : ne pas être indexé par les moteurs de recherche.
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">
          Skip to main content
        </a>
        {PUBLISHABLE_KEY ? (
          <>
            <SiteHeader />
            <main id="main">{children}</main>
          </>
        ) : (
          <main id="main" className="mx-auto max-w-2xl p-10">
            <h1 className="font-serif text-3xl">Storefront not configured</h1>
            <p className="mt-3">
              Set <code>NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY</code> in <code>storefront/.env.local</code> (see
              <code> .env.local.example</code>), then restart the site.
            </p>
          </main>
        )}
        <SiteFooter />
      </body>
    </html>
  )
}
