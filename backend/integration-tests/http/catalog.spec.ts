import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { setupCommerce } from "../helpers/commerce-setup"
import { bearer, createAdminToken, createVendor, makeCall, productBody } from "../helpers/world"

jest.setTimeout(10 * 60 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    const call = makeCall(api)
    let sh: Record<string, string>
    let admin: string
    let commerce: Awaited<ReturnType<typeof setupCommerce>>
    const vendors: Record<string, { id: string; token: string }> = {}
    const catalog = (qs = "") => call("get", `/store/catalog${qs}`, undefined, sh)
    const handles = (r: any) => r.data.catalog.map((c: any) => c.handle)

    async function listing(vendor: string, title: string, price: number) {
      const r = await call("post", "/vendors/products", productBody(title, price), bearer(vendors[vendor].token))
      expect(r.status).toBe(201)
      return r.data.product.id as string
    }
    async function catalogProduct(data: Record<string, unknown>, productIds: string[]) {
      const c = getContainer()
      const created = await (c.resolve("catalog") as any).createCatalogProducts(data)
      const link = c.resolve(ContainerRegistrationKeys.LINK)
      for (const id of productIds) {
        await link.create({ catalog: { catalog_product_id: created.id }, [Modules.PRODUCT]: { product_id: id } })
      }
      return created
    }

    beforeAll(async () => {
      commerce = await setupCommerce(getContainer())
      sh = { "x-publishable-api-key": commerce.publishableKey }
      admin = await createAdminToken(getContainer(), call, Modules)
      vendors.a = await createVendor(call, admin, "a")
      vendors.b = await createVendor(call, admin, "b")

      const kettleA = await listing("a", "Aurora Kettle (A)", 20)
      const kettleB = await listing("b", "Aurora Kettle (B)", 25)
      const lampA = await listing("a", "Aurora Lamp (A)", 40)
      const headsetB = await listing("b", "Zephyr Headset (B)", 60)
      await catalogProduct({ handle: "aurora-kettle", title: "Aurora Kettle", brand: "Norvik", category_handle: "home-kitchen" }, [kettleA, kettleB])
      await catalogProduct({ handle: "aurora-lamp", title: "Aurora Lamp", brand: "Alder", category_handle: "home-kitchen" }, [lampA])
      await catalogProduct({ handle: "zephyr-headset", title: "Zephyr Headset", brand: "Brisa", category_handle: "electronics" }, [headsetB])
      await catalogProduct({ handle: "orphan", title: "Orphan Product", brand: "Nobody", category_handle: "electronics" }, [])
    })

    it("liste les fiches avec offres, sans les fiches sans offre", async () => {
      const r = await catalog()
      expect(r.status).toBe(200)
      expect(handles(r).sort()).toEqual(["aurora-kettle", "aurora-lamp", "zephyr-headset"])
      const kettle = r.data.catalog.find((c: any) => c.handle === "aurora-kettle")
      expect(kettle.price_from).toBe(20)
      expect(kettle.offer_count).toBe(2)
      expect(kettle.vendor_count).toBe(2)
      expect(kettle.currency_code).toBe("usd")
      expect(r.data.count).toBe(3)
      expect(r.data.facets.vendors).toEqual([
        { handle: "vendor-a", name: "Vendor a", count: 2 },
        { handle: "vendor-b", name: "Vendor b", count: 2 },
      ])
    })

    it("filtre par catégorie, texte (titre ou marque) et vendeur", async () => {
      expect(handles(await catalog("?category=electronics"))).toEqual(["zephyr-headset"])
      expect(handles(await catalog("?q=aurora")).sort()).toEqual(["aurora-kettle", "aurora-lamp"])
      expect(handles(await catalog("?q=norvik"))).toEqual(["aurora-kettle"])
      expect(handles(await catalog("?q=nothing-matches"))).toEqual([])
      const onlyB = await catalog("?vendor=vendor-b")
      expect(handles(onlyB).sort()).toEqual(["aurora-kettle", "zephyr-headset"])
      const kettle = onlyB.data.catalog.find((c: any) => c.handle === "aurora-kettle")
      expect(kettle.price_from).toBe(25)
      expect(kettle.offer_count).toBe(1)
    })

    it("filtre par prix, trie et pagine", async () => {
      expect(handles(await catalog("?min_price=30")).sort()).toEqual(["aurora-lamp", "zephyr-headset"])
      expect(handles(await catalog("?max_price=25"))).toEqual(["aurora-kettle"])
      expect(handles(await catalog("?sort=price_asc"))).toEqual(["aurora-kettle", "aurora-lamp", "zephyr-headset"])
      expect(handles(await catalog("?sort=price_desc"))).toEqual(["zephyr-headset", "aurora-lamp", "aurora-kettle"])
      const page = await catalog("?sort=price_asc&limit=1&offset=1")
      expect(handles(page)).toEqual(["aurora-lamp"])
      expect(page.data.count).toBe(3)
    })

    it("met en tête les titres qui commencent par la recherche", async () => {
      const r = await catalog("?q=lamp")
      expect(handles(r)).toEqual(["aurora-lamp"])
      const r2 = await catalog("?q=a")
      expect(r2.status).toBe(200)
    })

    it("masque les offres d'un vendeur suspendu et les fiches qui n'ont plus d'offre", async () => {
      expect((await call("post", `/admin/vendors/${vendors.a.id}/status`, { status: "suspended" }, bearer(admin))).status).toBe(200)
      const r = await catalog()
      expect(handles(r).sort()).toEqual(["aurora-kettle", "zephyr-headset"])
      const kettle = r.data.catalog.find((c: any) => c.handle === "aurora-kettle")
      expect(kettle.price_from).toBe(25)
      expect(kettle.offer_count).toBe(1)
      expect((await call("get", "/store/catalog/aurora-lamp", undefined, sh)).status).toBe(404)
    })

    it("renvoie la fiche détaillée avec toutes les offres triées par prix", async () => {
      const r = await call("get", "/store/catalog/aurora-kettle", undefined, sh)
      expect(r.status).toBe(200)
      expect(r.data.product.offers.map((o: any) => [o.vendor_name, o.price])).toEqual([["Vendor a", 20], ["Vendor b", 25]])
      expect((await call("get", "/store/catalog/unknown", undefined, sh)).status).toBe(404)
      expect((await call("get", "/store/catalog/orphan", undefined, sh)).status).toBe(404)
    })

    it("trouve la fiche détaillée d'un produit même quand il y a plus de 100 fiches avant lui", async () => {
      const c = getContainer()
      const { result } = await createProductsWorkflow(c).run({
        input: {
          products: Array.from({ length: 105 }, (_, i) => ({
            title: `Filler ${String(i).padStart(3, "0")}`,
            status: "published" as const,
            shipping_profile_id: commerce.shippingProfileId,
            sales_channels: [{ id: commerce.salesChannelId }],
            options: [{ title: "Default", values: ["Default"] }],
            variants: [{ title: "Default", options: { Default: "Default" }, prices: [{ amount: 5, currency_code: "usd" }] }],
          })),
        },
      })
      const fillers = await (c.resolve("catalog") as any).createCatalogProducts(
        result.map((_: any, i: number) => ({ handle: `filler-${i}`, title: `Filler ${String(i).padStart(3, "0")}`, category_handle: "home-kitchen" }))
      )
      const link = c.resolve(ContainerRegistrationKeys.LINK)
      const links: any[] = result.flatMap((p: any, i: number) => [
          { catalog: { catalog_product_id: fillers[i].id }, [Modules.PRODUCT]: { product_id: p.id } },
          { marketplace: { vendor_id: vendors.a.id }, [Modules.PRODUCT]: { product_id: p.id } },
        ])
      await link.create(links)
      const all = await catalog("?limit=100")
      expect(all.data.count).toBeGreaterThan(105) // la fiche « Zephyr Headset » est au-delà des 100 premières
      expect(handles(all)).not.toContain("zephyr-headset")
      const detail = await call("get", "/store/catalog/zephyr-headset", undefined, sh)
      expect(detail.status).toBe(200)
      expect(detail.data.product.title).toBe("Zephyr Headset")
    })

    it("refuse l'accès sans clé publique et les paramètres invalides, et résiste aux caractères spéciaux", async () => {
      expect((await call("get", "/store/catalog")).status).toBeGreaterThanOrEqual(400)
      expect((await catalog("?sort=hack")).status).toBe(400)
      expect((await catalog("?limit=100000")).status).toBe(400)
      const inj = await catalog("?q=%27%3B%20drop%20table%20catalog_product%3B--")
      expect(inj.status).toBe(200)
      expect(handles(inj)).toEqual([])
      expect(handles(await catalog())).toContain("aurora-kettle")
      const wild = await catalog("?q=%25")
      expect(wild.status).toBe(200)
    })
  },
})
