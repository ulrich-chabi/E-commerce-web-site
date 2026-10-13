import { model } from "@medusajs/framework/utils"

// Registre des remboursements par commande vendeur : chaque remboursement est
// tracé (montant, motif, commande vendeur, commande client, paiement).
const VendorRefund = model.define("vendor_refund", {
  id: model.id().primaryKey(),
  vendor_order_id: model.text().index(),
  parent_order_id: model.text().index(),
  payment_id: model.text(),
  amount: model.bigNumber(),
  currency_code: model.text(),
  reason: model.text().nullable(),
  created_by: model.text().nullable(),
})

export default VendorRefund
