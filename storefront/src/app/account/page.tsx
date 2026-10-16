import type { Metadata } from "next"

export const metadata: Metadata = { title: "Account" }

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-3xl">Account</h1>
      <p className="mt-4 rounded-2xl border border-sand bg-white p-5">This part of the prototype is planned for a later release (F4).</p>
    </div>
  )
}
