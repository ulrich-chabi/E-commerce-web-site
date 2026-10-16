import type { Metadata } from "next"

export const metadata: Metadata = { title: "Cart" }

export default function CartPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-3xl">Cart</h1>
      <p className="mt-4 rounded-2xl border border-sand bg-white p-5">This part of the prototype is planned for a later release (F3).</p>
    </div>
  )
}
