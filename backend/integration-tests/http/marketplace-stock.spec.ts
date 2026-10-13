import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { setupCommerce } from "../helpers/commerce-setup"
import { bearer, createAdminToken, createCart, createVendor, makeCall, productBody } from "../helpers/world"

jest.setTimeout(10 * 60 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    const call = makeCall(api)
    let commerce: Awaited<ReturnType<typeof setupCommerce>>
    let storeHeaders: Record<string, string>
    let adminToken: string
    const v: Record<string, { id: string; token: string; variantId: string; inventoryItemId: string }> = {}

    const query = () => getContainer().resolve("query")
    async function reservedFor(inventoryItemId: string) {
      const { data } = await query().graph({
        entity: "reservation_item",
        fields: ["id", "quantity", "line_item_id"],
        filters: { inventory_item_id: inventoryItemId },
      })
      return data.reduce((s: number, r: any) => s + Number(r.quantity), 0)
    }
    async function setStock(inventoryItemId: string, quantity: number) {
      const { data } = await query().graph({
        entity: "inventory_level",
        fields: ["id", "location_id"],
        filters: { inventory_item_id: inventoryItemId },
      })
      const r = await call(
        "post",
        `/admin/inventory-items/${inventoryItemId}/location-levels/${commerce.locationId}`,
        { stocked_quantity: quantity },
        bearer(adminToken)
      )
      return r
    }

    beforeAll(async () => {
      commerce = await setupCommerce(getContainer())
      storeHeaders = { "x-publishable-api-key": commerce.publishableKey }
      adminToken = await createAdminToken(getContainer(), call, Modules)

      for (const [key, price] of [["a", 10], ["b", 30]] as const) {
        const vendor = await createVendor(call, adminToken, key)
        const p = await call("post", "/vendors/products", productBody(`Product ${key}`, price, true), bearer(vendor.token))
        expect(p.status).toBe(201)
        const variantId = p.data.product.variants[0].id
        const { data } = await query().graph({
          entity: "product_variant",
          fields: ["id", "inventory_items.inventory_item_id"],
          filters: { id: variantId },
        })
        const inventoryItemId = data[0].inventory_items[0].inventory_item_id
        const created = await call(
          "post",
          `/admin/inventory-items/${inventoryItemId}/location-levels`,
          { location_id: commerce.locationId, stocked_quantity: 5 },
          bearer(adminToken)
        )
        expect(created.status).toBe(200)
        v[key] = { ...vendor, variantId, inventoryItemId }
      }
    })

    it("une commande à deux vendeurs réserve chaque quantité une seule fois", async () => {
      const cartId = await createCart(call, commerce, storeHeaders, [
        { variantId: v.a.variantId, quantity: 2 },
        { variantId: v.b.variantId, quantity: 1 },
      ])
      const done = await call("post", `/store/carts/${cartId}/complete-vendor`, {}, storeHeaders)
      expect(done.status).toBe(200)
      expect(done.data.vendor_orders).toHaveLength(2)
      expect(await reservedFor(v.a.inventoryItemId)).toBe(2)
      expect(await reservedFor(v.b.inventoryItemId)).toBe(1)
    })

    it("deux achats simultanés du dernier stock : un seul réussit, jamais de stock négatif", async () => {
      expect((await setStock(v.a.inventoryItemId, 2)).status).toBe(200)
      const c1 = await createCart(call, commerce, storeHeaders, [{ variantId: v.a.variantId, quantity: 2 }])
      const c2 = await createCart(call, commerce, storeHeaders, [{ variantId: v.a.variantId, quantity: 2 }])
      const [r1, r2] = await Promise.all([
        call("post", `/store/carts/${c1}/complete-vendor`, {}, storeHeaders),
        call("post", `/store/carts/${c2}/complete-vendor`, {}, storeHeaders),
      ])
      const ok = [r1, r2].filter((r) => r.status === 200)
      expect(ok).toHaveLength(1)
      expect(await reservedFor(v.a.inventoryItemId)).toBe(2)
    })

    it("un échec sur un vendeur ne laisse aucune réservation chez l'autre", async () => {
      const cartId = await createCart(call, commerce, storeHeaders, [
        { variantId: v.a.variantId, quantity: 1 },
        { variantId: v.b.variantId, quantity: 5 },
      ])
      // Le stock du vendeur B disparaît entre l'ajout au panier et le paiement.
      expect((await setStock(v.b.inventoryItemId, 0)).status).toBe(200)
      const done = await call("post", `/store/carts/${cartId}/complete-vendor`, {}, storeHeaders)
      expect(done.status).not.toBe(200)
      expect(await reservedFor(v.a.inventoryItemId)).toBe(0)
      expect(await reservedFor(v.b.inventoryItemId)).toBe(0)
    })
  },
})
