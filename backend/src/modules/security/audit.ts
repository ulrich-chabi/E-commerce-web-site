import { MedusaContainer } from "@medusajs/framework/types"
import { SECURITY_MODULE } from "./index"
import SecurityModuleService from "./service"

export type AuditEntry = {
  action: string
  actor_type?: string | null
  actor_id?: string | null
  actor_email?: string | null
  ip?: string | null
  target_type?: string | null
  target_id?: string | null
  metadata?: Record<string, unknown> | null
}

// Écrit dans la base ET dans les journaux du serveur (sans email ni IP).
// Un échec d'écriture ne doit jamais bloquer l'action elle-même.
export async function recordAudit(scope: MedusaContainer, entry: AuditEntry) {
  try {
    const service: SecurityModuleService = scope.resolve(SECURITY_MODULE)
    await service.createAuditEvents(entry as any)
    const logger: any = scope.resolve("logger")
    logger.info(
      `AUDIT ${entry.action} actor=${entry.actor_type ?? "-"}:${entry.actor_id ?? "-"} target=${entry.target_type ?? "-"}:${entry.target_id ?? "-"}`
    )
  } catch (e) {
    try {
      ;(scope.resolve("logger") as any).error(`AUDIT échec d'écriture : ${(e as Error).message}`)
    } catch {}
  }
}
