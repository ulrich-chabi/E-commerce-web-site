import { model } from "@medusajs/framework/utils"

// Journal des actions sensibles. Ne jamais y mettre de mot de passe, de jeton
// ou de donnée de paiement. `actor_email` et `ip` sont des données personnelles :
// elles sont effacées après le délai de conservation (voir anonymize), le reste
// de l'événement (action, cible, date) est conservé.
const AuditEvent = model.define("audit_event", {
  id: model.id().primaryKey(),
  action: model.text().index(),
  actor_type: model.text().nullable(),
  actor_id: model.text().index().nullable(),
  actor_email: model.text().nullable(),
  ip: model.text().nullable(),
  target_type: model.text().nullable(),
  target_id: model.text().index().nullable(),
  metadata: model.json().nullable(),
  anonymized_at: model.dateTime().nullable(),
})

export default AuditEvent
