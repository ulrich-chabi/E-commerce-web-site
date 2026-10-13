import {
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { AdminCreateProduct } from "@medusajs/medusa/api/admin/products/validators"
import { PostVendorStatusSchema } from "./admin/vendors/[id]/status/route"
import { PostVendorOrderRefundSchema } from "./admin/vendor-orders/[id]/refund/route"
import { loginRateLimit, enforcePasswordPolicy } from "./auth-security"
import { ensureActiveVendor, ensureReadableVendor } from "./vendors/guard"
import { PostVendorCreateSchema } from "./vendors/route"
import { PostVendorStockSchema } from "./vendors/stock/route"

export default defineMiddlewares({
  routes: [
    // Inscription : identité authentifiée mais pas encore rattachée à un vendeur.
    {
      matcher: "/vendors",
      method: ["POST"],
      middlewares: [
        authenticate("vendor", ["session", "bearer"], { allowUnregistered: true }),
        validateAndTransformBody(PostVendorCreateSchema),
      ],
    },
    // Authentification : limitation des tentatives et longueur minimale du mot de passe.
    { matcher: "/auth/:actor_type/:auth_provider", method: ["POST"], middlewares: [loginRateLimit] },
    {
      matcher: "/auth/:actor_type/:auth_provider/register",
      method: ["POST"],
      middlewares: [enforcePasswordPolicy],
    },
    {
      matcher: "/auth/:actor_type/:auth_provider/update",
      method: ["POST"],
      middlewares: [enforcePasswordPolicy],
    },
    // Toutes les routes vendeur : identité vendeur, actif ou suspendu (lecture).
    {
      matcher: "/vendors/*",
      middlewares: [authenticate("vendor", ["session", "bearer"]), ensureReadableVendor],
    },
    // Catalogue et stock : vendeur actif uniquement (lecture comprise).
    { matcher: "/vendors/products", middlewares: [ensureActiveVendor] },
    { matcher: "/vendors/stock", middlewares: [ensureActiveVendor] },
    {
      matcher: "/vendors/products",
      method: ["POST"],
      middlewares: [validateAndTransformBody(AdminCreateProduct)],
    },
    {
      matcher: "/vendors/stock",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostVendorStockSchema)],
    },
    {
      matcher: "/admin/vendors/:id/status",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostVendorStatusSchema)],
    },
    {
      matcher: "/admin/vendor-orders/:id/refund",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostVendorOrderRefundSchema)],
    },
  ],
})
