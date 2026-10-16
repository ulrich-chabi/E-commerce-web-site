import Link from "next/link"
import type { CatalogCard } from "@/lib/catalog"
import { money, plural } from "@/lib/format"
import { ProductImage } from "./ProductImage"

export function ProductCard({ card }: { card: CatalogCard }) {
  const offers = plural(card.offer_count, "offer", "offers")
  const sellers = plural(card.vendor_count, "seller", "sellers")
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-sand bg-white p-4">
      <ProductImage title={card.title} category={card.category_handle} />
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="text-base font-semibold leading-snug">
          <Link href={`/p/${card.handle}`}>{card.title}</Link>
        </h3>
        {card.brand && <p className="text-sm text-muted">{card.brand}</p>}
        <p className="mt-1 text-lg font-semibold">
          <span className="text-sm font-normal text-muted">From </span>
          {money(card.price_from, card.currency_code)}
        </p>
        <p className="text-sm text-muted">{offers} from {sellers}</p>
      </div>
    </article>
  )
}
