import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import purgePersonalData from "../../src/jobs/purge-personal-data"
import { setupCommerce } from "../helpers/commerce-setup"
import {
  bearer, createAdminToken, createCart, createVendor, makeCall, PASSWORD, productBody,
} from "../helpers/world"

jest.setTimeout(10 * 60 * 1000)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
type V = { id: string; token: string; variantId?: string; productId?: string }

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    const call = makeCall(api)
    let commerce: Awaited<ReturnType<typeof setupCommerce>>
    let sh: Record<string, string>
    let admin: string
    const v: Record<string, V> = {}
    let order: any
    let vendorOrders: { id: string; vendor_id: string }[]

    const pg = () => getContainer().resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const security = () => getContainer().resolve("security") as any
    const login = (email: string, password: string) => call("post", "/auth/vendor/emailpass", { email, password })
    const failLogin = async (email: string, times: number) => {
      const out: number[] = []
      for (let i = 0; i < times; i++) {
        out.push((await login(email, "wrong-password")).status)
        await sleep(150) // l'enregistrement de l'échec se fait après l'envoi de la réponse
      }
      return out
    }
    const events = async (action?: string) =>
      (await call("get", `/admin/audit-events${action ? `?action=${action}` : ""}`, undefined, bearer(admin))).data

    beforeAll(async () => {
      commerce = await setupCommerce(getContainer())
      sh = { "x-publishable-api-key": commerce.publishableKey }
      admin = await createAdminToken(getContainer(), call, Modules)

      for (const [key, price, managed] of [["a", 10, true], ["b", 30, false]] as const) {
        const vendor = await createVendor(call, admin, key)
        const p = await call("post", "/vendors/products", productBody(`Product ${key}`, price, managed), bearer(vendor.token))
        expect(p.status).toBe(201)
        v[key] = { ...vendor, productId: p.data.product.id, variantId: p.data.product.variants[0].id }
        if (managed) {
          const s = await call("post", "/vendors/stock", { variant_id: v[key].variantId, stocked_quantity: 5 }, bearer(vendor.token))
          expect(s.status).toBe(200)
        }
      }
      v.pending = await createVendor(call, admin, "pending", false)

      const cartId = await createCart(call, commerce, sh, [
        { variantId: v.a.variantId!, quantity: 1 },
        { variantId: v.b.variantId!, quantity: 1 },
      ])
      const done = await call("post", `/store/carts/${cartId}/complete-vendor`, {}, sh)
      expect(done.status).toBe(200)
      order = done.data.order
      vendorOrders = done.data.vendor_orders
    })

    describe("Limitation des tentatives de connexion", () => {
      it("bloque après 5 échecs même avec le bon mot de passe, sans toucher les autres comptes, puis débloque", async () => {
        expect(await failLogin("vendor-a@test.local", 5)).toEqual([401, 401, 401, 401, 401])
        const blocked = await login("vendor-a@test.local", PASSWORD)
        expect(blocked.status).toBe(429)
        expect(blocked.data.message).toMatch(/Trop de tentatives/)
        expect((await login("vendor-b@test.local", PASSWORD)).status).toBe(200)

        await pg().raw("update login_attempt set created_at = now() - interval '30 minutes'")
        expect((await login("vendor-a@test.local", PASSWORD)).status).toBe(200)
      })

      it("traite un compte inconnu exactement comme un compte existant", async () => {
        const known = await login("vendor-a@test.local", "wrong-password")
        await sleep(150)
        const unknown = await login("nobody@test.local", "wrong-password")
        await sleep(150)
        expect(unknown.status).toBe(known.status)
        expect(unknown.data).toEqual(known.data)

        expect(await failLogin("ghost@test.local", 4)).toEqual([401, 401, 401, 401]) // 5e échec ci-dessous
        await sleep(150)
        expect((await login("ghost@test.local", "wrong-password")).status).toBe(401)
        await sleep(150)
        const sixth = await login("ghost@test.local", "wrong-password")
        expect(sixth.status).toBe(429)
        expect(sixth.data.message).toMatch(/Trop de tentatives/)
      })

      it("une connexion réussie remet le compteur à zéro", async () => {
        await failLogin("vendor-b@test.local", 3)
        expect((await login("vendor-b@test.local", PASSWORD)).status).toBe(200)
        await sleep(150)
        expect(await failLogin("vendor-b@test.local", 4)).toEqual([401, 401, 401, 401])
        expect((await login("vendor-b@test.local", PASSWORD)).status).toBe(200)
      })
    })

    describe("Règle de mot de passe", () => {
      const register = (password: string, email = "newcomer@test.local") =>
        call("post", "/auth/vendor/emailpass/register", { email, password })

      it("refuse un mot de passe trop court et accepte la longueur minimale (4 par défaut)", async () => {
        expect((await register("abc")).status).toBe(400)
        expect((await register("abcd")).status).toBe(200)
      })

      it("applique la longueur configurée", async () => {
        process.env.PASSWORD_MIN_LENGTH = "12"
        try {
          expect((await register("abcd", "other@test.local")).status).toBe(400)
          expect((await register("abcdefghijkl", "other@test.local")).status).toBe(200)
        } finally {
          delete process.env.PASSWORD_MIN_LENGTH
        }
      })
    })

    describe("Journal d'audit", () => {
      it("enregistre un changement de statut avec l'auteur, sans donnée secrète, et seule la plateforme peut le lire", async () => {
        const r = await call("post", `/admin/vendors/${v.a.id}/status`, { status: "suspended" }, bearer(admin))
        expect(r.status).toBe(200)
        const list = await events("vendor.status_changed")
        const e = list.events.find((x: any) => x.target_id === v.a.id)
        expect(e).toBeTruthy()
        expect(e.actor_type).toBe("user")
        expect(e.actor_id).toBeTruthy()
        expect(e.metadata).toEqual({ from: "active", to: "suspended" })
        expect((await call("get", "/admin/audit-events", undefined, bearer(v.b.token))).status).toBe(401)
        expect((await call("get", "/admin/audit-events")).status).toBe(401)
      })

      it("enregistre inscription vendeur, mise à jour de stock, blocage de connexion et remboursement", async () => {
        const kinds = (await events()).events.map((x: any) => x.action)
        expect(kinds).toContain("vendor.registered")
        expect(kinds).toContain("vendor.stock_updated")

        await failLogin("vendor-b@test.local", 5)
        await login("vendor-b@test.local", PASSWORD) // bloqué
        expect((await events("auth.login_blocked")).events.length).toBeGreaterThan(0)

        const full = await call("get", `/admin/orders/${order.id}?fields=*payment_collections.payments`, undefined, bearer(admin))
        const paymentId = full.data.order.payment_collections[0].payments[0].id
        expect((await call("post", `/admin/payments/${paymentId}/capture`, {}, bearer(admin))).status).toBe(200)
        const vo = vendorOrders.find((o) => o.vendor_id === v.a.id)!
        const refund = await call("post", `/admin/vendor-orders/${vo.id}/refund`, { amount: 4, reason: "test" }, bearer(admin))
        expect(refund.status).toBe(200)
        const ev = (await events("vendor_order.refunded")).events[0]
        expect(ev.target_id).toBe(vo.id)
        expect(ev.metadata.amount).toBe(4)
      })

      it("ne contient jamais de mot de passe", async () => {
        await failLogin("vendor-a@test.local", 2)
        const all = JSON.stringify((await events()).events)
        expect(all).not.toContain(PASSWORD)
        expect(all).not.toContain("wrong-password")
      })
    })

    describe("Conservation temporaire des données personnelles", () => {
      it("efface email et IP des événements anciens, garde le reste, et purge les vieux échecs de connexion", async () => {
        await failLogin("vendor-b@test.local", 5)
        await login("vendor-b@test.local", PASSWORD) // crée un événement avec email et IP
        const before = (await events("auth.login_blocked")).events[0]
        expect(before.actor_email).toBe("vendor-b@test.local")
        expect(before.ip).toBeTruthy()

        // Un événement vieilli de 120 jours (délai par défaut : 90) et des échecs vieux de 2 jours.
        await pg().raw("update audit_event set created_at = now() - interval '120 days' where id = ?", [before.id])
        await security().createAuditEvents({
          action: "auth.login_blocked", actor_type: "vendor", actor_email: "recent@test.local", ip: "203.0.113.9",
        })
        await pg().raw("update login_attempt set created_at = now() - interval '2 days'")
        await security().createLoginAttempts({ key: "recent-key" })

        await purgePersonalData(getContainer())

        const old = (await events("auth.login_blocked")).events.find((x: any) => x.id === before.id)
        expect(old.actor_email).toBeNull()
        expect(old.ip).toBeNull()
        expect(old.anonymized_at).toBeTruthy()
        expect(old.action).toBe("auth.login_blocked")
        expect(old.actor_type).toBe("vendor")

        const recent = (await events("auth.login_blocked")).events.find((x: any) => x.actor_email === "recent@test.local")
        expect(recent.ip).toBe("203.0.113.9")

        const rows = await pg().raw("select key from login_attempt")
        expect(rows.rows.map((r: any) => r.key)).toEqual(["recent-key"])
      })
    })

    describe("Vendeur suspendu : lecture seule de ses commandes", () => {
      it("voit ses commandes mais ne peut rien modifier ni voir celles des autres", async () => {
        expect((await call("post", `/admin/vendors/${v.a.id}/status`, { status: "suspended" }, bearer(admin))).status).toBe(200)
        const mine = vendorOrders.find((o) => o.vendor_id === v.a.id)!
        const theirs = vendorOrders.find((o) => o.vendor_id === v.b.id)!

        const list = await call("get", "/vendors/orders", undefined, bearer(v.a.token))
        expect(list.status).toBe(200)
        expect(list.data.orders.map((o: any) => o.id)).toEqual([mine.id])
        expect((await call("get", `/vendors/orders/${mine.id}`, undefined, bearer(v.a.token))).status).toBe(200)
        expect((await call("get", `/vendors/orders/${theirs.id}`, undefined, bearer(v.a.token))).status).toBe(404)

        expect((await call("post", "/vendors/products", productBody("Nouveau", 1), bearer(v.a.token))).status).toBe(403)
        expect((await call("get", "/vendors/products", undefined, bearer(v.a.token))).status).toBe(403)
        expect((await call("get", "/vendors/stock", undefined, bearer(v.a.token))).status).toBe(403)
        expect((await call("post", "/vendors/stock", { variant_id: v.a.variantId, stocked_quantity: 9 }, bearer(v.a.token))).status).toBe(403)
      })

      it("un vendeur en attente n'a accès à rien", async () => {
        expect((await call("get", "/vendors/orders", undefined, bearer(v.pending.token))).status).toBe(403)
      })
    })
  },
})
