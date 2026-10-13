import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { setupCommerce } from "../helpers/commerce-setup"

jest.setTimeout(10 * 60 * 1000)

const PASSWORD = "Test-Only-Password-1!"

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    const call = (method: string, url: string, data?: any, headers?: any) =>
      api.request({ method, url, data, headers, validateStatus: () => true })
    const bearer = (t: string) => ({ Authorization: `Bearer ${t}` })

    let commerce: Awaited<ReturnType<typeof setupCommerce>>
    let adminToken: string
    const vendors: Record<string, { id: string; token: string; productId?: string; variantId?: string }> = {}
    let order: any
    let vendorOrders: { id: string; vendor_id: string }[]
    let storeHeaders: Record<string, string>

    const productBody = (title: string, price: number) => ({
      title,
      status: "published",
      options: [{ title: "Size", values: ["One"] }],
      variants: [
        {
          title: "One",
          options: { Size: "One" },
          manage_inventory: false,
          prices: [{ amount: price, currency_code: "usd" }],
        },
      ],
    })

    // Le premier administrateur ne peut pas être créé par l'API sans être déjà
    // connecté : on le crée directement via les modules, comme le fait Medusa.
    async function createAdmin() {
      const container = getContainer()
      const email = "platform-admin@test.local"
      const user = await container.resolve(Modules.USER).createUsers({ email })
      const auth: any = container.resolve(Modules.AUTH)
      const { authIdentity } = await auth.register("emailpass", {
        body: { email, password: PASSWORD },
      })
      await auth.updateAuthIdentities({
        id: authIdentity.id,
        app_metadata: { user_id: user.id },
      })
      const login = await call("post", "/auth/user/emailpass", { email, password: PASSWORD })
      expect(login.status).toBe(200)
      return login.data.token as string
    }

    async function createVendor(key: string, activate = true) {
      const email = `vendor-${key}@test.local`
      const reg = await call("post", "/auth/vendor/emailpass/register", { email, password: PASSWORD })
      const created = await call(
        "post",
        "/vendors",
        { name: `Vendor ${key}`, admin: { email } },
        bearer(reg.data.token)
      )
      expect(created.status).toBe(201)
      const login = await call("post", "/auth/vendor/emailpass", { email, password: PASSWORD })
      vendors[key] = { id: created.data.vendor.id, token: login.data.token }
      if (activate) {
        const r = await call(
          "post",
          `/admin/vendors/${vendors[key].id}/status`,
          { status: "active" },
          bearer(adminToken)
        )
        expect(r.status).toBe(200)
      }
    }

    async function createVendorProduct(key: string, price: number) {
      const r = await call("post", "/vendors/products", productBody(`Product ${key}`, price), bearer(vendors[key].token))
      expect(r.status).toBe(201)
      vendors[key].productId = r.data.product.id
      vendors[key].variantId = r.data.product.variants[0].id
    }

    async function buildCart(lines: { variantId: string; quantity: number }[]) {
      const cart = await call(
        "post",
        "/store/carts",
        {
          region_id: commerce.regionId,
          email: "buyer@test.local",
          shipping_address: {
            first_name: "Test", last_name: "Buyer", address_1: "1 Test Street",
            city: "Austin", country_code: "us", postal_code: "78701",
          },
        },
        storeHeaders
      )
      const cartId = cart.data.cart.id
      for (const l of lines) {
        const r = await call(
          "post",
          `/store/carts/${cartId}/line-items`,
          { variant_id: l.variantId, quantity: l.quantity },
          storeHeaders
        )
        expect(r.status).toBe(200)
      }
      await call("post", `/store/carts/${cartId}/shipping-methods`, { option_id: commerce.shippingOptionId }, storeHeaders)
      const pc = await call("post", "/store/payment-collections", { cart_id: cartId }, storeHeaders)
      await call(
        "post",
        `/store/payment-collections/${pc.data.payment_collection.id}/payment-sessions`,
        { provider_id: "pp_system_default" },
        storeHeaders
      )
      return cartId as string
    }

    beforeAll(async () => {
      const container = getContainer()
      commerce = await setupCommerce(container)
      storeHeaders = { "x-publishable-api-key": commerce.publishableKey }
      adminToken = await createAdmin()

      await createVendor("a")
      await createVendor("b")
      await createVendor("c") // actif, sans commande
      await createVendor("pending", false)
      await createVendorProduct("a", 10) // 2 x 10 = 20
      await createVendorProduct("b", 30) // 1 x 30 = 30

      const cartId = await buildCart([
        { variantId: vendors.a.variantId!, quantity: 2 },
        { variantId: vendors.b.variantId!, quantity: 1 },
      ])
      const done = await call("post", `/store/carts/${cartId}/complete-vendor`, {}, storeHeaders)
      expect(done.status).toBe(200)
      order = done.data.order
      vendorOrders = done.data.vendor_orders

      // Paiement capturé, nécessaire pour pouvoir rembourser.
      const full = await call(
        "get",
        `/admin/orders/${order.id}?fields=*payment_collections.payments`,
        undefined,
        bearer(adminToken)
      )
      const paymentId = full.data.order.payment_collections[0].payments[0].id
      const cap = await call("post", `/admin/payments/${paymentId}/capture`, {}, bearer(adminToken))
      expect(cap.status).toBe(200)
    })

    const vendorOrderOf = (key: string) => vendorOrders.find((o) => o.vendor_id === vendors[key].id)!

    describe("Accès et permissions", () => {
      it("refuse les routes vendeur sans authentification", async () => {
        expect((await call("get", "/vendors/products")).status).toBe(401)
        expect((await call("get", "/vendors/orders")).status).toBe(401)
      })

      it("refuse un vendeur en attente de validation", async () => {
        const r = await call("get", "/vendors/products", undefined, bearer(vendors.pending.token))
        expect(r.status).toBe(403)
      })

      it("refuse un vendeur suspendu", async () => {
        const s = await call("post", `/admin/vendors/${vendors.a.id}/status`, { status: "suspended" }, bearer(adminToken))
        expect(s.status).toBe(200)
        const r = await call("get", "/vendors/products", undefined, bearer(vendors.a.token))
        expect(r.status).toBe(403)
      })

      it("un jeton vendeur n'ouvre pas les routes d'administration", async () => {
        const r = await call(
          "post",
          `/admin/vendor-orders/${vendorOrderOf("a").id}/refund`,
          { amount: 1 },
          bearer(vendors.a.token)
        )
        expect(r.status).toBe(401)
      })
    })

    describe("Isolation entre vendeurs", () => {
      it("chaque vendeur ne voit que ses produits", async () => {
        const a = await call("get", "/vendors/products", undefined, bearer(vendors.a.token))
        const b = await call("get", "/vendors/products", undefined, bearer(vendors.b.token))
        expect(a.data.products.map((p: any) => p.id)).toEqual([vendors.a.productId])
        expect(b.data.products.map((p: any) => p.id)).toEqual([vendors.b.productId])
      })

      it("chaque vendeur ne voit que sa commande, avec ses seules lignes", async () => {
        const a = await call("get", "/vendors/orders", undefined, bearer(vendors.a.token))
        expect(a.status).toBe(200)
        expect(a.data.orders).toHaveLength(1)
        expect(a.data.orders[0].id).toBe(vendorOrderOf("a").id)
        expect(a.data.orders[0].items).toHaveLength(1)
        expect(Number(a.data.orders[0].total)).toBe(20)
      })

      it("un vendeur sans commande reçoit une liste vide (et non toutes les commandes)", async () => {
        const c = await call("get", "/vendors/orders", undefined, bearer(vendors.c.token))
        expect(c.status).toBe(200)
        expect(c.data.orders).toEqual([])
      })

      it("la commande d'un autre vendeur est introuvable (404)", async () => {
        const own = await call("get", `/vendors/orders/${vendorOrderOf("a").id}`, undefined, bearer(vendors.a.token))
        expect(own.status).toBe(200)
        const other = await call("get", `/vendors/orders/${vendorOrderOf("b").id}`, undefined, bearer(vendors.a.token))
        expect(other.status).toBe(404)
      })
    })

    describe("Commande multi-vendeurs", () => {
      it("découpe le panier en une commande par vendeur, reliées à la commande client", async () => {
        expect(vendorOrders).toHaveLength(2)
        expect(new Set(vendorOrders.map((o) => o.vendor_id))).toEqual(new Set([vendors.a.id, vendors.b.id]))
        expect(vendorOrders.map((o) => o.id)).not.toContain(order.id)
        const query = getContainer().resolve("query")
        const { data } = await query.graph({
          entity: "order",
          fields: ["id", "metadata"],
          filters: { id: vendorOrders.map((o) => o.id) },
        })
        for (const o of data) expect(o.metadata?.parent_order_id).toBe(order.id)
      })

      it("refuse un panier contenant un produit sans vendeur, sans créer de commande", async () => {
        const created = await call(
          "post",
          "/admin/products",
          {
            ...productBody("Orphan product", 5),
            shipping_profile_id: commerce.shippingProfileId,
            sales_channels: [{ id: commerce.salesChannelId }],
          },
          bearer(adminToken)
        )
        expect(created.status).toBe(200)
        const cartId = await buildCart([{ variantId: created.data.product.variants[0].id, quantity: 1 }])
        const before = await call("get", "/admin/orders", undefined, bearer(adminToken))
        const r = await call("post", `/store/carts/${cartId}/complete-vendor`, {}, storeHeaders)
        expect(r.status).toBe(400)
        const after = await call("get", "/admin/orders", undefined, bearer(adminToken))
        expect(after.data.count).toBe(before.data.count)
      })
    })

    describe("Remboursement partiel par vendeur", () => {
      const refund = (key: string, amount: number) =>
        call("post", `/admin/vendor-orders/${vendorOrderOf(key).id}/refund`, { amount, reason: "test" }, bearer(adminToken))

      it("rembourse partiellement un vendeur sans toucher à l'autre", async () => {
        const r = await refund("a", 5)
        expect(r.status).toBe(200)
        expect(r.data.refunded).toBe(5)
        expect(r.data.remaining).toBe(15)

        const service: any = getContainer().resolve("marketplace")
        const ledgerA = await service.listVendorRefunds({ vendor_order_id: vendorOrderOf("a").id })
        const ledgerB = await service.listVendorRefunds({ vendor_order_id: vendorOrderOf("b").id })
        expect(ledgerA).toHaveLength(1)
        expect(Number(ledgerA[0].amount)).toBe(5)
        expect(ledgerB).toHaveLength(0)

        const bFull = await refund("b", 30)
        expect(bFull.status).toBe(200)
        expect(bFull.data.remaining).toBe(0)
      })

      it("refuse un remboursement supérieur au montant restant de la commande vendeur", async () => {
        expect((await refund("a", 12)).status).toBe(200)
        const over = await refund("a", 9)
        expect(over.status).toBe(400)
        const service: any = getContainer().resolve("marketplace")
        const ledgerA = await service.listVendorRefunds({ vendor_order_id: vendorOrderOf("a").id })
        expect(ledgerA).toHaveLength(1)
      })

      it("le remboursement du vendeur A ne peut pas consommer la part du vendeur B", async () => {
        // Le paiement capturé total (55) dépasse largement 21 : seul le plafond
        // propre à la commande vendeur empêche ce remboursement.
        const r = await refund("a", 21)
        expect(r.status).toBe(400)
      })

      it("refuse un montant nul ou négatif", async () => {
        expect((await refund("a", 0)).status).toBe(400)
        expect((await refund("a", -3)).status).toBe(400)
      })
    })
  },
})
