import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { VendorStatus } from "../../modules/marketplace/models/vendor"

export type VendorContext = { vendorId: string; vendorAdminId: string; status: VendorStatus }

// Contrôle commun aux routes /vendors/* (sauf l'inscription) : l'identité doit
// correspondre à un administrateur de vendeur, et le statut du vendeur doit
// faire partie des statuts autorisés. Le vendeur est TOUJOURS déduit de
// l'identité, jamais d'un identifiant fourni par le client.
export const ensureVendor =
  (allowed: VendorStatus[]) =>
  async (req: AuthenticatedMedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const actorId = req.auth_context?.actor_id
    if (!actorId) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Authentification vendeur requise.")
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const {
      data: [admin],
    } = await query.graph({
      entity: "vendor_admin",
      fields: ["id", "vendor.id", "vendor.status"],
      filters: { id: actorId },
    })

    if (!admin?.vendor?.id) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Compte vendeur introuvable.")
    }
    if (!allowed.includes(admin.vendor.status as VendorStatus)) {
      res.status(403).json({
        type: "not_allowed",
        message: "Action impossible avec le statut actuel du vendeur.",
      })
      return
    }

    ;(req as any).vendorContext = {
      vendorId: admin.vendor.id,
      vendorAdminId: admin.id,
      status: admin.vendor.status,
    } as VendorContext
    next()
  }

// Écriture, catalogue, stock : vendeur actif uniquement.
export const ensureActiveVendor = ensureVendor(["active"])
// Lecture des commandes : un vendeur suspendu peut encore voir ce qu'il doit honorer.
export const ensureReadableVendor = ensureVendor(["active", "suspended"])

export const getVendorContext = (req: AuthenticatedMedusaRequest): VendorContext =>
  (req as any).vendorContext
