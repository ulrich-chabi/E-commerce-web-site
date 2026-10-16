import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import { MARKETPLACE_MODULE } from "../modules/marketplace"
import { CATALOG_MODULE } from "../modules/catalog"
import setVendorStatusWorkflow from "../workflows/marketplace/set-vendor-status"
import { BRANDS, COLORS, DEPARTMENTS, rng, VENDORS } from "./seed-data"

// Alimente une base VIDE avec une boutique américaine (USD), des rayons, des
// vendeurs fictifs et un catalogue fictif. À lancer une seule fois :
//   npx medusa exec ./src/scripts/seed-marketplace.ts
// Variable : SEED_PRODUCTS_PER_CATEGORY (20 par défaut).
export default async function seedMarketplace({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query: any = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const catalogService: any = container.resolve(CATALOG_MODULE)
  const marketplace: any = container.resolve(MARKETPLACE_MODULE)
  const perCategory = Math.max(1, Number(process.env.SEED_PRODUCTS_PER_CATEGORY ?? 20))

  if ((await catalogService.listCatalogProducts({}, { take: 1 })).length > 0) {
    logger.info("Le catalogue contient déjà des fiches : rien à faire.")
    return
  }

  // ---------- Boutique : devise, canal de vente, région, livraison ----------
  logger.info("Boutique : devise USD, région États-Unis, livraison forfaitaire…")
  const storeModule = container.resolve(Modules.STORE)
  const store = (await storeModule.listStores())[0]
  let salesChannelId = store.default_sales_channel_id as string | null
  if (!salesChannelId) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "Default Sales Channel" }] },
    })
    salesChannelId = result[0].id
  }
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [{ currency_code: "usd", is_default: true }],
        default_sales_channel_id: salesChannelId,
      },
    },
  })

  let regionId: string
  const regions = await container.resolve(Modules.REGION).listRegions({ currency_code: "usd" })
  if (regions[0]) regionId = regions[0].id
  else {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          { name: "United States", currency_code: "usd", countries: ["us"], payment_providers: ["pp_system_default"] },
        ],
      },
    })
    regionId = result[0].id
  }
  const taxRegions = await container.resolve(Modules.TAX).listTaxRegions({ country_code: "us" })
  if (!taxRegions[0]) {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "us", provider_id: "tp_system" }],
    })
  }

  const fulfillment = container.resolve(Modules.FULFILLMENT)
  let profile = (await fulfillment.listShippingProfiles({ type: "default" }))[0]
  if (!profile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    })
    profile = result[0]
  }

  const existingOptions = await fulfillment.listShippingOptions({ name: "Standard" })
  if (!existingOptions[0]) {
    const { result: locs } = await createStockLocationsWorkflow(container).run({
      input: { locations: [{ name: "Platform Warehouse", address: { city: "Austin", country_code: "US", address_1: "" } }] },
    })
    const location = locs[0]
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: location.id, add: [salesChannelId] },
    })
    const set = await fulfillment.createFulfillmentSets({
      name: "US delivery",
      type: "shipping",
      service_zones: [{ name: "US", geo_zones: [{ country_code: "us", type: "country" }] }],
    })
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: set.id },
    })
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: set.service_zones[0].id,
          shipping_profile_id: profile.id,
          type: { label: "Standard", description: "Demo shipping", code: "standard" },
          prices: [{ currency_code: "usd", amount: 5 }],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    })
  }

  // Clé publique de la boutique (nécessaire au site).
  const apiKeyModule = container.resolve(Modules.API_KEY)
  let key = (await apiKeyModule.listApiKeys({ type: "publishable", title: "Storefront" }))[0]
  if (!key) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }] },
    })
    key = result[0]
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: key.id, add: [salesChannelId] },
    })
  }

  // ---------- Rayons ----------
  logger.info(`Rayons : ${DEPARTMENTS.length}…`)
  const categoryModule = container.resolve(Modules.PRODUCT)
  const existingCats = await categoryModule.listProductCategories({}, { select: ["id", "handle"] })
  const have = new Set(existingCats.map((c: any) => c.handle))
  const toCreate = DEPARTMENTS.filter((d) => !have.has(d.handle))
  if (toCreate.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: toCreate.map((d) => ({ name: d.name, handle: d.handle, is_active: true })),
      },
    })
  }

  // ---------- Vendeurs (le premier représente les ventes directes) ----------
  logger.info(`Vendeurs : ${VENDORS.length}…`)
  const vendors: { id: string; name: string; locationId: string }[] = []
  for (const v of VENDORS) {
    const created = await marketplace.createVendors({ name: v.name, handle: v.handle, status: "pending" })
    await setVendorStatusWorkflow(container).run({ input: { vendor_id: created.id, status: "active" } })
    const {
      data: [withLoc],
    } = await query.graph({ entity: "vendor", fields: ["id", "stock_location.id"], filters: { id: created.id } })
    vendors.push({ id: created.id, name: v.name, locationId: withLoc.stock_location.id })
  }

  // ---------- Catalogue : fiches + offres ----------
  const random = rng(20261012)
  const pick = <T,>(arr: T[]) => arr[Math.floor(random() * arr.length)]
  let catalogCount = 0
  let offerCount = 0

  for (const dept of DEPARTMENTS) {
    logger.info(`Catalogue : ${dept.name} (${perCategory} fiches)…`)
    const rows: { catalog: any; offers: { vendorIdx: number; price: number; stock: number; condition: string }[] }[] = []

    for (let i = 0; i < perCategory; i++) {
      const type = dept.types[i % dept.types.length]
      const brand = BRANDS[Math.floor(random() * BRANDS.length)]
      const code = `${String.fromCharCode(65 + Math.floor(random() * 26))}${100 + Math.floor(random() * 900)}`
      const title = `${brand} ${type} ${code}`
      const handle = `${dept.handle}-${i + 1}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
      const base = dept.priceMin + random() * (dept.priceMax - dept.priceMin)
      const offerTotal = 1 + Math.floor(random() * 4) // 1 à 4 offres
      const chosen = new Set<number>()
      while (chosen.size < Math.min(offerTotal, vendors.length)) chosen.add(Math.floor(random() * vendors.length))

      const catalog = await catalogService.createCatalogProducts({
        handle, title, brand, category_handle: dept.handle,
        description: "Fictional demo product for the prototype. No real brand, specification or review.",
        attributes: { color: pick(COLORS), model: code },
      })
      rows.push({
        catalog,
        offers: [...chosen].map((vendorIdx) => ({
          vendorIdx,
          price: Math.round(base * (0.9 + random() * 0.3) * 100) / 100,
          stock: 3 + Math.floor(random() * 58),
          condition: dept.handle === "electronics" && random() < 0.25 ? "renewed" : "new",
        })),
      })
    }

    // Création des produits vendeur par lots.
    const flat = rows.flatMap((r) => r.offers.map((o) => ({ ...o, catalog: r.catalog })))
    for (let start = 0; start < flat.length; start += 40) {
      const batch = flat.slice(start, start + 40)
      const { result: created } = await createProductsWorkflow(container).run({
        input: {
          products: batch.map((o) => ({
            title: o.catalog.title,
            handle: `${o.catalog.handle}-${vendors[o.vendorIdx].id.slice(-6).toLowerCase()}`,
            status: "published" as const,
            shipping_profile_id: profile.id,
            sales_channels: [{ id: salesChannelId! }],
            options: [{ title: "Default", values: ["Default"] }],
            metadata: { condition: o.condition, catalog_handle: o.catalog.handle },
            variants: [
              {
                title: "Default",
                options: { Default: "Default" },
                manage_inventory: true,
                prices: [{ amount: o.price, currency_code: "usd" }],
              },
            ],
          })),
        },
      })

      const links: any[] = []
      created.forEach((p: any, idx: number) => {
        links.push({
          [MARKETPLACE_MODULE]: { vendor_id: vendors[batch[idx].vendorIdx].id },
          [Modules.PRODUCT]: { product_id: p.id },
        })
        links.push({
          [CATALOG_MODULE]: { catalog_product_id: batch[idx].catalog.id },
          [Modules.PRODUCT]: { product_id: p.id },
        })
      })
      await link.create(links)

      const variantIds = created.map((p: any) => p.variants[0].id)
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "inventory_items.inventory_item_id"],
        filters: { id: variantIds },
      })
      const itemByVariant = new Map<string, string>(
        variants.map((v: any) => [v.id, v.inventory_items[0].inventory_item_id])
      )
      await createInventoryLevelsWorkflow(container).run({
        input: {
          inventory_levels: created.map((p: any, idx: number) => ({
            inventory_item_id: itemByVariant.get(p.variants[0].id)!,
            location_id: vendors[batch[idx].vendorIdx].locationId,
            stocked_quantity: batch[idx].stock,
          })),
        },
      })
      offerCount += batch.length
    }
    catalogCount += rows.length
  }

  logger.info(`Terminé : ${catalogCount} fiches catalogue, ${offerCount} offres, ${vendors.length} vendeurs.`)
  logger.info("----------------------------------------------------------------")
  logger.info(`Clé publique à mettre dans le site (NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) :`)
  logger.info(String((key as any).token))
  logger.info("----------------------------------------------------------------")
}
