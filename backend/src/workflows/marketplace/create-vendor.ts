import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { setAuthAppMetadataStep, useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { MARKETPLACE_MODULE } from "../../modules/marketplace"
import MarketplaceModuleService from "../../modules/marketplace/service"

export type CreateVendorWorkflowInput = {
  name: string
  handle?: string
  logo?: string
  admin: { email: string; first_name?: string; last_name?: string }
  authIdentityId: string
}

const createVendorStep = createStep(
  "create-vendor",
  async (
    data: { name: string; handle?: string; logo?: string },
    { container }
  ) => {
    const service: MarketplaceModuleService = container.resolve(MARKETPLACE_MODULE)
    // Le handle est dérivé du nom si absent ; le statut initial est "pending".
    const handle =
      data.handle ||
      data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const vendor = await service.createVendors({ ...data, handle, status: "pending" })
    return new StepResponse(vendor, vendor.id)
  },
  async (vendorId, { container }) => {
    if (!vendorId) return
    const service: MarketplaceModuleService = container.resolve(MARKETPLACE_MODULE)
    await service.deleteVendors(vendorId)
  }
)

const createVendorAdminStep = createStep(
  "create-vendor-admin",
  async (
    data: { email: string; first_name?: string; last_name?: string; vendor_id: string },
    { container }
  ) => {
    const service: MarketplaceModuleService = container.resolve(MARKETPLACE_MODULE)
    const admin = await service.createVendorAdmins(data)
    return new StepResponse(admin, admin.id)
  },
  async (adminId, { container }) => {
    if (!adminId) return
    const service: MarketplaceModuleService = container.resolve(MARKETPLACE_MODULE)
    await service.deleteVendorAdmins(adminId)
  }
)

const createVendorWorkflow = createWorkflow(
  "create-vendor",
  function (input: CreateVendorWorkflowInput) {
    const vendor = createVendorStep({
      name: input.name,
      handle: input.handle,
      logo: input.logo,
    })

    const adminData = transform({ input, vendor }, (d) => ({
      ...d.input.admin,
      vendor_id: d.vendor.id,
    }))
    const vendorAdmin = createVendorAdminStep(adminData)

    setAuthAppMetadataStep({
      authIdentityId: input.authIdentityId,
      actorType: "vendor",
      value: vendorAdmin.id,
    })

    const { data: vendorWithAdmin } = useQueryGraphStep({
      entity: "vendor",
      fields: ["id", "name", "handle", "logo", "status", "admins.*"],
      filters: { id: vendor.id },
    })

    return new WorkflowResponse({ vendor: vendorWithAdmin[0] })
  }
)

export default createVendorWorkflow
