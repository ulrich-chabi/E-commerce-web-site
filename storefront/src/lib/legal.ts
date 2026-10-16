// Pages d'information du pied de page. Les textes sont des EMPLACEMENTS : aucun
// texte juridique n'est inventé, il sera rédigé par le propriétaire du projet.
export const LEGAL_PAGES: Record<string, { title: string; placeholder: string }> = {
  about: { title: "About this concept", placeholder: "Description of the project, to be written by the owner." },
  accessibility: { title: "Accessibility", placeholder: "Accessibility statement, to be written after accessibility testing." },
  contact: { title: "Contact us", placeholder: "Contact details, to be provided by the owner." },
  sell: { title: "Become a seller", placeholder: "Seller onboarding (planned for the seller area)." },
  "seller-sign-in": { title: "Seller sign in", placeholder: "Seller sign in (planned for the seller area)." },
  advertise: { title: "Advertise your products", placeholder: "Sponsored listings program, to be defined." },
  delivery: { title: "Delivery rates and times", placeholder: "Delivery policy (simulated in this prototype)." },
  payments: { title: "Payment methods", placeholder: "Payments are simulated in this prototype: no real charge is made." },
  currency: { title: "Currency", placeholder: "Prices are shown in US dollars (USD)." },
  returns: { title: "Returns and refunds", placeholder: "Returns policy, to be defined by the owner." },
  safety: { title: "Product safety notices", placeholder: "Product safety notices, to be defined." },
  help: { title: "Help center", placeholder: "Help articles, to be written." },
  terms: { title: "Terms of use", placeholder: "Legal text to be written and reviewed by a professional." },
  privacy: { title: "Privacy notice", placeholder: "Legal text to be written and reviewed by a professional." },
  "ad-choices": { title: "Your ad choices", placeholder: "Advertising choices, to be defined." },
  "sponsored-results": { title: "How sponsored results work", placeholder: "Explanation of sponsored results, to be written when the sponsored program exists." },
}

export const FOOTER_COLUMNS: { title: string; links: [slug: string, label: string][] }[] = [
  { title: "About", links: [["about", "About this concept"], ["accessibility", "Accessibility"], ["contact", "Contact us"]] },
  { title: "Sell with us", links: [["sell", "Become a seller"], ["seller-sign-in", "Seller sign in"], ["advertise", "Advertise your products"]] },
  { title: "Payments and delivery", links: [["delivery", "Delivery rates and times"], ["payments", "Payment methods"], ["currency", "Currency"]] },
  { title: "Help", links: [["returns", "Returns and refunds"], ["safety", "Product safety notices"], ["help", "Help center"]] },
]
