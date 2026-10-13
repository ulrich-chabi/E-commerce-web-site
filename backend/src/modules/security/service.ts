import { createHmac } from "crypto"
import { MedusaService } from "@medusajs/framework/utils"
import AuditEvent from "./models/audit-event"
import LoginAttempt from "./models/login-attempt"

export const settings = {
  maxFailures: () => Number(process.env.LOGIN_MAX_FAILURES ?? 5),
  lockMinutes: () => Number(process.env.LOGIN_LOCK_MINUTES ?? 15),
  passwordMinLength: () => Number(process.env.PASSWORD_MIN_LENGTH ?? 4),
  retentionDays: () => Number(process.env.PERSONAL_DATA_RETENTION_DAYS ?? 90),
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000)

class SecurityModuleService extends MedusaService({ AuditEvent, LoginAttempt }) {
  // Empreinte de l'identifiant : le même compte donne toujours la même clé,
  // qu'il existe ou non (pas de différence observable pour un compte inconnu).
  attemptKey(actorType: string, email: string) {
    const secret = process.env.COOKIE_SECRET || "dev-only-cookie-secret"
    return createHmac("sha256", secret)
      .update(`${actorType}:${email.trim().toLowerCase()}`)
      .digest("hex")
  }

  async isLocked(key: string) {
    const [, count] = await this.listAndCountLoginAttempts(
      { key, created_at: { $gte: minutesAgo(settings.lockMinutes()) } },
      { take: 1 }
    )
    return count >= settings.maxFailures()
  }

  async recordFailure(key: string) {
    await this.createLoginAttempts({ key })
  }

  async clearFailures(key: string) {
    const rows = await this.listLoginAttempts({ key }, { select: ["id"], take: 1000 })
    if (rows.length) await this.deleteLoginAttempts(rows.map((r) => r.id))
  }

  // Supprime les échecs de plus de 24 h (inutiles pour la limitation).
  async purgeOldAttempts() {
    const rows = await this.listLoginAttempts(
      { created_at: { $lt: minutesAgo(24 * 60) } },
      { select: ["id"], take: 5000 }
    )
    if (rows.length) await this.deleteLoginAttempts(rows.map((r) => r.id))
    return rows.length
  }

  // Efface email et IP des événements plus vieux que le délai de conservation.
  async anonymizeOldEvents() {
    const cutoff = new Date(Date.now() - settings.retentionDays() * 24 * 3600 * 1000)
    const rows = await this.listAuditEvents(
      { created_at: { $lt: cutoff }, anonymized_at: null },
      { select: ["id"], take: 5000 }
    )
    if (rows.length) {
      await this.updateAuditEvents(
        rows.map((r) => ({ id: r.id, actor_email: null, ip: null, anonymized_at: new Date() }))
      )
    }
    return rows.length
  }
}

export default SecurityModuleService
