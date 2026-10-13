import { model } from "@medusajs/framework/utils"

// Échecs de connexion récents. `key` est une empreinte (HMAC) de l'identifiant :
// ni l'email ni l'adresse IP ne sont stockés. Les lignes sont purgées après 24 h.
const LoginAttempt = model.define("login_attempt", {
  id: model.id().primaryKey(),
  key: model.text().index(),
})

export default LoginAttempt
