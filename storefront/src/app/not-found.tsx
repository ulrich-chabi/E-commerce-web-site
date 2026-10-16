import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-3xl">Page not found</h1>
      <p className="mt-3">We couldn&apos;t find that page. <Link href="/">Go to the home page</Link>.</p>
    </div>
  )
}
