import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ProductImage } from "@/components/ProductImage"
import { fetchProduct } from "@/lib/catalog"
import { money, plural } from "@/lib/format"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ handle: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await fetchProduct((await params).handle)
  return { title: product?.title ?? "Product not found" }
}

// Version simple de la fiche : l'achat, la comparaison et le détail des offres
// arrivent à l'incrément suivant.
export default async function ProductPage({ params }: Props) {
  const product = await fetchProduct((await params).handle)
  if (!product) notFound()
  return (
    <div className="grid gap-8 px-6 py-8 lg:grid-cols-[24rem_1fr] lg:px-10">
      <ProductImage title={product.title} category={product.category_handle} />
      <div>
        <h1 className="font-serif text-3xl">{product.title}</h1>
        {product.brand && <p className="text-muted">{product.brand}</p>}
        {product.description && <p className="mt-3">{product.description}</p>}
        <h2 className="mt-6 text-xl font-semibold">{plural(product.offers.length, "offer", "offers")}</h2>
        <table className="mt-3 w-full border-collapse text-left">
          <caption className="sr-only">Offers from sellers</caption>
          <thead>
            <tr className="border-b border-sand"><th className="py-2 pr-4">Seller</th><th className="py-2">Price</th></tr>
          </thead>
          <tbody>
            {product.offers.map((o) => (
              <tr key={o.product_id} className="border-b border-sand">
                <td className="py-2 pr-4">{o.vendor_name}</td>
                <td className="py-2">{money(o.price, o.currency_code)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-sm text-muted">Adding to cart and delivery details are coming in the next release.</p>
      </div>
    </div>
  )
}
