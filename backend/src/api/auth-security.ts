import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { recordAudit } from "../modules/security/audit"
import { SECURITY_MODULE } from "../modules/security"
import SecurityModuleService, { settings } from "../modules/security/service"

const GENERIC_LOCK_MESSAGE = "Trop de tentatives. Réessayez dans quelques minutes."

// Limitation des tentatives sur la connexion (POST /auth/:actor_type/:provider).
// Le compteur est tenu par identifiant saisi, que le compte existe ou non : un
// compte inconnu se comporte exactement comme un compte réel.
export async function loginRateLimit(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const body = (req.body ?? {}) as { email?: unknown }
  const email = typeof body.email === "string" ? body.email : ""
  if (!email) return next()

  const actorType = String(req.params.actor_type ?? "")
  const service: SecurityModuleService = req.scope.resolve(SECURITY_MODULE)
  const key = service.attemptKey(actorType, email)

  if (await service.isLocked(key)) {
    await recordAudit(req.scope, {
      action: "auth.login_blocked",
      actor_type: actorType,
      actor_email: email.trim().toLowerCase(),
      ip: req.ip ?? null,
    })
    res.status(429).json({ type: "too_many_requests", message: GENERIC_LOCK_MESSAGE })
    return
  }

  res.on("finish", () => {
    const task =
      res.statusCode === 401
        ? service.recordFailure(key)
        : res.statusCode === 200
        ? service.clearFailures(key)
        : Promise.resolve()
    task.catch(() => undefined)
  })
  next()
}

// Règle de longueur minimale sur les routes qui définissent un mot de passe.
export function enforcePasswordPolicy(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const body = (req.body ?? {}) as { password?: unknown }
  const min = settings.passwordMinLength()
  if (typeof body.password !== "string" || body.password.length < min) {
    res.status(400).json({
      type: "invalid_data",
      message: `Mot de passe trop court (minimum ${min} caractères).`,
    })
    return
  }
  next()
}
