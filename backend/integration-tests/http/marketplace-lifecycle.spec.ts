import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { setupCommerce } from "../helpers/commerce-setup"
import { bearer, createAdminToken, createCart, createVendor, makeCall, productBody } from "../helpers/world"

jest.setTimeout(10 * 60 * 1000)

type V = { id: string; token: string; productId?: string; variantId?: string; itemId?: string }

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

    const q = () => getContainer().resolve(ContainerRegistrationKeys.QUERY) as any
    const status = (id: string, s: string) => call("post", `/admin/vendors/${id}/status`, { status: s }, bearer(admin))
    const locationOf = async (key: string) =>
      (await q().graph({ entity: "vendor", fields: ["stock_location.id"], filters: { id: v[key].id } })).data[0]?.stock_location?.id
    const vendorStatus = async (key: string) =>
      (await q().graph({ entity: "vendor", fields: ["status"], filters: { id: v[key].id } })).data[0].status
    const productStatus = async (id: string) =>
      (await q().graph({ entity: "product", fields: ["status"], filters: { id } })).data[0]?.status

    async function newVendorWithProduct(key: string, price: number, stock: number) {
      const vendor = await createVendor(call, admin, key)
      const p = await call("post", "/vendors/products", productBody(`Product ${key}`, price, true), bearer(vendor.token))
      expect(p.status).toBe(201)
      const variantId = p.data.product.variants[0].id
      const { data } = await q().graph({ entity: "product_variant", fields: ["id", "inventory_items.inventory_item_id"], filters: { id: variantId } })
      const s = await call("post", "/vendors/stock", { variant_id: variantId, stocked_quantity: stock }, bearer(vendor.token))
      expect(s.status).toBe(200)
      v[key] = { ...vendor, productId: p.data.product.id, variantId, itemId: data[0].inventory_items[0].inventory_item_id }
    }

    beforeAll(async () => {
      commerce = await setupCommerce(getContainer())
      sh = { "x-publishable-api-key": commerce.publishableKey }
      admin = await createAdminToken(getContainer(), call, Modules)
      await newVendorWithProduct("a", 10, 5)
      await newVendorWithProduct("b", 30, 5)

      const cartId = await createCart(call, commerce, sh, [
        { variantId: v.a.variantId!, quantity: 2 },
        { variantId: v.b.variantId!, quantity: 1 },
      ])
      const done = await call("post", `/store/carts/${cartId}/complete-vendor`, {}, sh)
      expect(done.status).toBe(200)
      order = done.data.order
      vendorOrders = done.data.vendor_orders
    })

    describe("Emplacement de stock par vendeur", () => {
      it("est créé à la première activation, une seule fois, avec le stock réservé chez son propriétaire", async () => {
        const la = await locationOf("a")
        const lb = await locationOf("b")
        expect(la).toBeTruthy()
        expect(lb).toBeTruthy()
        expect(la).not.toBe(lb)
        expect((await status(v.a.id, "suspended")).status).toBe(200)
        expect((await status(v.a.id, "active")).status).toBe(200)
        expect(await locationOf("a")).toBe(la)
        const { data } = await q().graph({ entity: "reservation_item", fields: ["quantity", "location_id"], filters: { inventory_item_id: v.a.itemId } })
        expect(data.map((r: any) => [Number(r.quantity), r.location_id])).toEqual([[2, la]])
      })

      it("le vendeur gère son stock, et seulement le sien", async () => {
        const mine = await call("get", "/vendors/stock", undefined, bearer(v.a.token))
        expect(mine.status).toBe(200)
        expect(mine.data.stock).toHaveLength(1)
        expect(mine.data.stock[0].stocked_quantity).toBe(5)
        expect(mine.data.stock[0].reserved_quantity).toBe(2)

        const up = await call("post", "/vendors/stock", { variant_id: v.a.variantId, stocked_quantity: 9 }, bearer(v.a.token))
        expect(up.status).toBe(200)
        const other = await call("post", "/vendors/stock", { variant_id: v.b.variantId, stocked_quantity: 999 }, bearer(v.a.token))
        expect(other.status).toBe(404)
        const lvlB = await q().graph({ entity: "inventory_level", fields: ["stocked_quantity"], filters: { inventory_item_id: v.b.itemId } })
        expect(Number(lvlB.data[0].stocked_quantity)).toBe(5)
      })

      it("refuse un stock inférieur aux quantités déjà réservées", async () => {
        const r = await call("post", "/vendors/stock", { variant_id: v.a.variantId, stocked_quantity: 1 }, bearer(v.a.token))
        expect(r.status).toBe(400)
      })
    })

    describe("Suspension", () => {
      it("retire les produits de la vente, puis les rétablit sans publier ce qui était en brouillon", async () => {
        const draft = await call("post", "/vendors/products", { ...productBody("Draft a", 5), status: "draft" }, bearer(v.a.token))
        expect(draft.status).toBe(201)
        expect((await status(v.a.id, "suspended")).status).toBe(200)
        expect(await productStatus(v.a.productId!)).toBe("draft")
        expect((await status(v.a.id, "active")).status).toBe(200)
        expect(await productStatus(v.a.productId!)).toBe("published")
        expect(await productStatus(draft.data.product.id)).toBe("draft")
        // Les produits de B n'ont jamais été touchés.
        expect(await productStatus(v.b.productId!)).toBe("published")
      })

      it("empêche de finaliser un panier contenant un produit d'un vendeur suspendu", async () => {
        const cartId = await createCart(call, commerce, sh, [{ variantId: v.a.variantId!, quantity: 1 }])
        await status(v.a.id, "suspended")
        const before = await call("get", "/admin/orders", undefined, bearer(admin))
        const r = await call("post", `/store/carts/${cartId}/complete-vendor`, {}, sh)
        expect(r.status).toBeGreaterThanOrEqual(400)
        const after = await call("get", "/admin/orders", undefined, bearer(admin))
        expect(after.data.count).toBe(before.data.count)
      })
    })
  },
})
