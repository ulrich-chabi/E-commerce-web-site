"use client"

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-3xl">Something went wrong</h1>
      <p className="mt-3">We couldn&apos;t load this page. Make sure the backend is running, then try again.</p>
      <button type="button" onClick={reset} className="mt-4 min-h-11 rounded-xl bg-terracotta px-5 text-white">Try again</button>
    </div>
  )
}
