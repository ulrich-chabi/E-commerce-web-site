import { tintFor } from "@/lib/format"

// Visuel de substitution FICTIF : teinte par rayon et initiales de la marque.
export function ProductImage({ title, category, className = "" }: { title: string; category: string | null; className?: string }) {
  const initials = title
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
  return (
    <svg
      role="img"
      aria-label={`Placeholder illustration for ${title}`}
      viewBox="0 0 200 140"
      className={`block h-auto w-full rounded-xl ${className}`}
    >
      <rect width="200" height="140" fill={tintFor(category)} />
      <circle cx="100" cy="64" r="34" fill="#ffffff" opacity="0.6" />
      <text x="100" y="74" textAnchor="middle" fontSize="28" fontFamily="Georgia, serif" fill="#2b2420">{initials}</text>
      <text x="100" y="124" textAnchor="middle" fontSize="10" fill="#5e524a">Placeholder image</text>
    </svg>
  )
}
