import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { recordAudit } from "../../../../../modules/security/audit"
import refundVendorOrderWorkflow from "../../../../../workflows/marketplace/refund-vendor-order"

export const PostVendorOrderRefundSchema = z
  .object({ amount: z.number().positive(), reason: z.string().optional() })
  .strict()

// Remboursement (partiel ou total) d'UNE commande vendeur, décidé par la plateforme.
export const POST = async (
  req: AuthenticatedMedusaRequest<z.infer<typeof PostVendorOrderRefundSchema>>,
  res: MedusaResponse
) => {
  const { result } = await refundVendorOrderWorkflow(req.scope).run({
    input: {
      vendor_order_id: req.params.id,
      amount: req.validatedBody.amount,
      reason: req.validatedBody.reason,
      created_by: req.auth_context?.actor_id,
    },
  })
  await recordAudit(req.scope, {
    action: "vendor_order.refunded",
    actor_type: req.auth_context?.actor_type,
    actor_id: req.auth_context?.actor_id,
    ip: req.ip ?? null,
    target_type: "order",
    target_id: req.params.id,
    metadata: {
      amount: result.refunded,
      remaining: result.remaining,
      reason: req.validatedBody.reason ?? null,
    },
  })
  res.json(result)
}
