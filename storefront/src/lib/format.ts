export function money(amount: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount)
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

// Teinte de substitution par rayon (visuels fictifs, sans image réelle).
const TINTS = ["#ebd9b8", "#d8e6e3", "#f0d5c8", "#e4dcc8", "#d9e0ea", "#ecdfe0", "#dfe6d3", "#e8e0d0"]
export function tintFor(key: string | null | undefined) {
  let h = 0
  for (const c of key ?? "x") h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TINTS[h % TINTS.length]
}
