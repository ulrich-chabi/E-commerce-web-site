import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { recordAudit } from "../../modules/security/audit"
import createVendorWorkflow, {
  CreateVendorWorkflowInput,
} from "../../workflows/marketplace/create-vendor"

export const PostVendorCreateSchema = z
  .object({
    name: z.string().min(1),
    handle: z.string().optional(),
    logo: z.string().optional(),
    admin: z
      .object({
        email: z.string().email(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
      })
      .strict(),
  })
  .strict()

type RequestBody = z.infer<typeof PostVendorCreateSchema>

// Inscription d'un vendeur : le vendeur est créé "pending" et ne peut rien
// faire tant que la plateforme ne l'a pas activé.
export const POST = async (
  req: AuthenticatedMedusaRequest<RequestBody>,
  res: MedusaResponse
) => {
  if (req.auth_context?.actor_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Requête déjà authentifiée comme vendeur."
    )
  }

  const { result } = await createVendorWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      authIdentityId: req.auth_context.auth_identity_id,
    } as CreateVendorWorkflowInput,
  })

  await recordAudit(req.scope, {
    action: "vendor.registered",
    actor_type: "vendor",
    actor_email: req.validatedBody.admin.email.toLowerCase(),
    ip: req.ip ?? null,
    target_type: "vendor",
    target_id: (result.vendor as any).id,
  })
  res.status(201).json({ vendor: result.vendor })
}
