import { model } from "@medusajs/framework/utils"
import VendorAdmin from "./vendor-admin"

export const VENDOR_STATUSES = ["pending", "active", "suspended"] as const
export type VendorStatus = (typeof VENDOR_STATUSES)[number]

const Vendor = model.define("vendor", {
  id: model.id().primaryKey(),
  handle: model.text().unique(),
  name: model.text(),
  logo: model.text().nullable(),
  // pending → active ⇄ suspended. Seule la plateforme change le statut.
  status: model.enum([...VENDOR_STATUSES]).default("pending"),
  admins: model.hasMany(() => VendorAdmin, { mappedBy: "vendor" }),
})

export default Vendor
