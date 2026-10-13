import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { refundPaymentWorkflow } from "@medusajs/medusa/core-flows"
import { MARKETPLACE_MODULE } from "../../modules/marketplace"
import MarketplaceModuleService from "../../modules/marketplace/service"

export type RefundVendorOrderInput = {
  vendor_order_id: string
  amount: number
  reason?: string
  created_by?: string
}

const toCents = (v: unknown): number => {
  const n = Number((v as any)?.numeric ?? v)
  return Math.round(n * 100)
}

// Vérifie le plafond de remboursement de CETTE commande vendeur, puis écrit
// le remboursement dans le registre. Annulé automatiquement si la suite échoue.
const prepareRefundStep = createStep(
  "prepare-vendor-refund",
  async (input: RefundVendorOrderInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const service: MarketplaceModuleService = container.resolve(MARKETPLACE_MODULE)

    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["id", "total", "currency_code", "metadata", "vendor.id"],
      filters: { id: input.vendor_order_id },
    })
    if (!order || !order.vendor?.id) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Commande vendeur introuvable."
      )
    }

    const parentId = (order.metadata?.parent_order_id as string) || order.id
    const {
      data: [parent],
    } = await query.graph({
      entity: "order",
      fields: ["id", "payment_collections.payments.id", "payment_collections.payments.captured_at"],
      filters: { id: parentId },
    })
    const payments = (parent?.payment_collections || []).flatMap(
      (pc: any) => pc?.payments || []
    )
    const payment = payments.find((p: any) => p?.captured_at)
    if (!payment) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Aucun paiement capturé à rembourser pour cette commande."
      )
    }

    const previous = await service.listVendorRefunds({ vendor_order_id: order.id })
    const refundedCents = previous.reduce((s, r) => s + toCents(r.amount), 0)
    const remainingCents = toCents(order.total) - refundedCents
    const amountCents = toCents(input.amount)

    if (amountCents <= 0) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Montant invalide.")
    }
    if (amountCents > remainingCents) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Remboursement supérieur au montant restant de cette commande vendeur (${remainingCents / 100}).`
      )
    }

    const record = await service.createVendorRefunds({
      vendor_order_id: order.id,
      parent_order_id: parentId,
      payment_id: payment.id,
      amount: amountCents / 100,
      currency_code: order.currency_code,
      reason: input.reason ?? null,
      created_by: input.created_by ?? null,
    })

    return new StepResponse(
      {
        payment_id: payment.id as string,
        amount: amountCents / 100,
        record_id: record.id,
        remaining: (remainingCents - amountCents) / 100,
      },
      record.id
    )
  },
  async (recordId, { container }) => {
    if (!recordId) return
    const service: MarketplaceModuleService = container.resolve(MARKETPLACE_MODULE)
    await service.deleteVendorRefunds(recordId)
  }
)

const refundVendorOrderWorkflow = createWorkflow(
  "refund-vendor-order",
  (input: RefundVendorOrderInput) => {
    const prepared = prepareRefundStep(input)

    const refundInput = transform({ input, prepared }, (d) => ({
      payment_id: d.prepared.payment_id,
      amount: d.prepared.amount,
      created_by: d.input.created_by,
      note: d.input.reason,
    }))
    refundPaymentWorkflow.runAsStep({ input: refundInput })

    return new WorkflowResponse({
      refunded: prepared.amount,
      remaining: prepared.remaining,
      record_id: prepared.record_id,
    })
  }
)

export default refundVendorOrderWorkflow
