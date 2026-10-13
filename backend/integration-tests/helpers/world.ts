import { setupCommerce } from "./commerce-setup"

export const PASSWORD = "Test-Only-Password-1!"

export type Call = (method: string, url: string, data?: any, headers?: any) => Promise<any>
export const bearer = (t: string) => ({ Authorization: `Bearer ${t}` })

export const makeCall =
  (api: any): Call =>
  (method, url, data, headers) =>
    api.request({ method, url, data, headers, validateStatus: () => true })

export const productBody = (title: string, price: number, manageInventory = false) => ({
  title,
  status: "published",
  options: [{ title: "Size", values: ["One"] }],
  variants: [
    {
      title: "One",
      options: { Size: "One" },
      manage_inventory: manageInventory,
      prices: [{ amount: price, currency_code: "usd" }],
    },
  ],
})

export async function createAdminToken(container: any, call: Call, Modules: any) {
  const email = "platform-admin@test.local"
  const user = await container.resolve(Modules.USER).createUsers({ email })
  const auth: any = container.resolve(Modules.AUTH)
  const { authIdentity } = await auth.register("emailpass", { body: { email, password: PASSWORD } })
  await auth.updateAuthIdentities({ id: authIdentity.id, app_metadata: { user_id: user.id } })
  const login = await call("post", "/auth/user/emailpass", { email, password: PASSWORD })
  if (login.status !== 200) throw new Error("Connexion admin de test impossible")
  return login.data.token as string
}

export async function createVendor(call: Call, adminToken: string, key: string, activate = true) {
  const email = `vendor-${key}@test.local`
  const reg = await call("post", "/auth/vendor/emailpass/register", { email, password: PASSWORD })
  const created = await call("post", "/vendors", { name: `Vendor ${key}`, admin: { email } }, bearer(reg.data.token))
  if (created.status !== 201) throw new Error("Création vendeur de test impossible")
  const login = await call("post", "/auth/vendor/emailpass", { email, password: PASSWORD })
  const vendor = { id: created.data.vendor.id as string, token: login.data.token as string }
  if (activate) {
    const r = await call("post", `/admin/vendors/${vendor.id}/status`, { status: "active" }, bearer(adminToken))
    if (r.status !== 200) throw new Error("Activation vendeur de test impossible")
  }
  return vendor
}

export async function createCart(
  call: Call,
  commerce: Awaited<ReturnType<typeof setupCommerce>>,
  storeHeaders: Record<string, string>,
  lines: { variantId: string; quantity: number }[]
) {
  const cart = await call(
    "post",
    "/store/carts",
    {
      region_id: commerce.regionId,
      email: "buyer@test.local",
      shipping_address: {
        first_name: "Test", last_name: "Buyer", address_1: "1 Test Street",
        city: "Austin", country_code: "us", postal_code: "78701",
      },
    },
    storeHeaders
  )
  const cartId = cart.data.cart.id as string
  for (const l of lines) {
    const r = await call("post", `/store/carts/${cartId}/line-items`, { variant_id: l.variantId, quantity: l.quantity }, storeHeaders)
    if (r.status !== 200) throw new Error(`Ajout au panier impossible (${r.status})`)
  }
  await call("post", `/store/carts/${cartId}/shipping-methods`, { option_id: commerce.shippingOptionId }, storeHeaders)
  const pc = await call("post", "/store/payment-collections", { cart_id: cartId }, storeHeaders)
  await call(
    "post",
    `/store/payment-collections/${pc.data.payment_collection.id}/payment-sessions`,
    { provider_id: "pp_system_default" },
    storeHeaders
  )
  return cartId
}
