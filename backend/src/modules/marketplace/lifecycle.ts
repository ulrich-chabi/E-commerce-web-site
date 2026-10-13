import { VendorStatus } from "./models/vendor"

// Transitions autorisées du statut d'un vendeur. Aucune suppression de compte :
// un vendeur suspendu garde ses données et peut être réactivé.
export const ALLOWED_TRANSITIONS: Record<VendorStatus, VendorStatus[]> = {
  pending: ["active"],
  active: ["suspended"],
  suspended: ["active"],
}

// Statuts pour lesquels les produits du vendeur sont retirés de la vente.
export const HIDING_STATUSES: VendorStatus[] = ["suspended"]

export function canTransition(from: VendorStatus, to: VendorStatus) {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}
