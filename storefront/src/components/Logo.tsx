import Link from "next/link"

// Emplacement du logo : à remplacer par le logo définitif.
export function Logo() {
  return (
    <Link
      href="/"
      aria-label="Logo (home page)"
      className="flex h-12 w-36 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-muted text-sm text-muted no-underline"
    >
      Logo
    </Link>
  )
}
