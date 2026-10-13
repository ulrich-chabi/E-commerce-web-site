import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SECURITY_MODULE } from "../../../modules/security"
import SecurityModuleService from "../../../modules/security/service"

// Consultation du journal (réservée aux utilisateurs de la plateforme).
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const service: SecurityModuleService = req.scope.resolve(SECURITY_MODULE)
  const q = req.query as Record<string, string | undefined>
  const limit = Math.min(Math.max(Number(q.limit ?? 50) || 50, 1), 200)
  const offset = Math.max(Number(q.offset ?? 0) || 0, 0)
  const filters: Record<string, unknown> = {}
  if (q.action) filters.action = q.action
  if (q.target_id) filters.target_id = q.target_id

  const [events, count] = await service.listAndCountAuditEvents(filters, {
    take: limit,
    skip: offset,
    order: { created_at: "DESC" },
  })
  res.json({ events, count, limit, offset })
}
