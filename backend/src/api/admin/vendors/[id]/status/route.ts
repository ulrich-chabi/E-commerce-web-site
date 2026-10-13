import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { recordAudit } from "../../../../../modules/security/audit"
import setVendorStatusWorkflow from "../../../../../workflows/marketplace/set-vendor-status"

export const PostVendorStatusSchema = z
  .object({ status: z.enum(["active", "suspended"]) })
  .strict()

// Réservé aux utilisateurs de la plateforme (route /admin/*).
export const POST = async (
  req: AuthenticatedMedusaRequest<z.infer<typeof PostVendorStatusSchema>>,
  res: MedusaResponse
) => {
  const { result } = await setVendorStatusWorkflow(req.scope).run({
    input: { vendor_id: req.params.id, status: req.validatedBody.status },
  })
  await recordAudit(req.scope, {
    action: "vendor.status_changed",
    actor_type: req.auth_context?.actor_type,
    actor_id: req.auth_context?.actor_id,
    ip: req.ip ?? null,
    target_type: "vendor",
    target_id: req.params.id,
    metadata: { from: result.previous_status, to: req.validatedBody.status },
  })
  res.json({ vendor: result.vendor })
}
