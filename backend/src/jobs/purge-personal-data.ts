import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SECURITY_MODULE } from "../modules/security"
import SecurityModuleService, { settings } from "../modules/security/service"

// Chaque nuit : efface l'email et l'IP des événements du journal plus vieux que
// le délai de conservation (les événements eux-mêmes sont gardés) et supprime
// les échecs de connexion de plus de 24 h.
export default async function purgePersonalData(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service: SecurityModuleService = container.resolve(SECURITY_MODULE)
  const anonymized = await service.anonymizeOldEvents()
  const purged = await service.purgeOldAttempts()
  logger.info(
    `Données personnelles : ${anonymized} événement(s) anonymisé(s) (délai ${settings.retentionDays()} jours), ${purged} échec(s) de connexion supprimé(s).`
  )
}

export const config = {
  name: "purge-personal-data",
  schedule: "30 3 * * *",
}
