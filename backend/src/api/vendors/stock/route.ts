import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  createInventoryLevelsWorkflow,
  updateInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"
import { recordAudit } from "../../../modules/security/audit"
import { getVendorContext } from "../guard"

export const PostVendorStockSchema = z
  .object({ variant_id: z.string().min(1), stocked_quantity: z.number().int().min(0) })
  .strict()

async function loadVendor(req: AuthenticatedMedusaRequest, vendorId: string) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [vendor],
  } = await query.graph({
    entity: "vendor",
    fields: [
      "id", "stock_location.id",
      "products.variants.id", "products.variants.title", "products.variants.manage_inventory",
      "products.variants.inventory_items.inventory_item_id",
    ],
    filters: { id: vendorId },
  })
  return vendor
}

// Stock du vendeur authentifié : uniquement ses variantes, uniquement son emplacement.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { vendorId } = getVendorContext(req)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const vendor = await loadVendor(req, vendorId)
  const locationId = vendor?.stock_location?.id

  const variants = ((vendor?.products ?? []) as any[]).flatMap((p) => p.variants ?? [])
  const itemIds = variants.flatMap((v: any) => (v.inventory_items ?? []).map((i: any) => i.inventory_item_id))

  let levels: any[] = []
  if (locationId && itemIds.length > 0) {
    const { data } = await query.graph({
      entity: "inventory_level",
      fields: ["inventory_item_id", "stocked_quantity", "reserved_quantity"],
      filters: { location_id: locationId, inventory_item_id: itemIds },
    })
    levels = data
  }

  res.json({
    stock: variants.map((v: any) => {
      const itemId = v.inventory_items?.[0]?.inventory_item_id
      const level = levels.find((l) => l.inventory_item_id === itemId)
      return {
        variant_id: v.id,
        title: v.title,
        manage_inventory: v.manage_inventory,
        stocked_quantity: level ? Number(level.stocked_quantity) : null,
        reserved_quantity: level ? Number(level.reserved_quantity) : null,
      }
    }),
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<z.infer<typeof PostVendorStockSchema>>,
  res: MedusaResponse
) => {
  const { vendorId } = getVendorContext(req)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const vendor = await loadVendor(req, vendorId)

  const variant = ((vendor?.products ?? []) as any[])
    .flatMap((p) => p.variants ?? [])
    .find((v: any) => v.id === req.validatedBody.variant_id)
  // Une variante d'un autre vendeur est indiscernable d'une variante inexistante.
  if (!variant) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Variante introuvable.")
  }
  const itemId = variant.inventory_items?.[0]?.inventory_item_id
  const locationId = vendor?.stock_location?.id
  if (!variant.manage_inventory || !itemId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Le stock de cette variante n'est pas géré.")
  }
  if (!locationId) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Aucun emplacement de stock pour ce vendeur.")
  }

  const {
    data: [existing],
  } = await query.graph({
    entity: "inventory_level",
    fields: ["id", "reserved_quantity"],
    filters: { inventory_item_id: itemId, location_id: locationId },
  })

  if (existing) {
    if (req.validatedBody.stocked_quantity < Number(existing.reserved_quantity)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Le stock ne peut pas être inférieur aux quantités déjà réservées (${existing.reserved_quantity}).`
      )
    }
    await updateInventoryLevelsWorkflow(req.scope).run({
      input: {
        updates: [
          {
            id: existing.id,
            inventory_item_id: itemId,
            location_id: locationId,
            stocked_quantity: req.validatedBody.stocked_quantity,
          },
        ],
      },
    })
  } else {
    await createInventoryLevelsWorkflow(req.scope).run({
      input: {
        inventory_levels: [
          {
            inventory_item_id: itemId,
            location_id: locationId,
            stocked_quantity: req.validatedBody.stocked_quantity,
          },
        ],
      },
    })
  }
  await recordAudit(req.scope, {
    action: "vendor.stock_updated",
    actor_type: "vendor",
    actor_id: getVendorContext(req).vendorAdminId,
    ip: req.ip ?? null,
    target_type: "variant",
    target_id: variant.id,
    metadata: { vendor_id: vendorId, stocked_quantity: req.validatedBody.stocked_quantity },
  })
  res.json({ variant_id: variant.id, stocked_quantity: req.validatedBody.stocked_quantity })
}
