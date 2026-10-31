import { type Db, subscription } from "@acme/db"
import { eq } from "drizzle-orm"
import { applyEvent } from "./apply"
import { type PaidPlanId, type PlanId, planFor } from "./plans"
import { createPolar, type PolarOptions } from "./polar"
import { createStripe, type StripeOptions } from "./stripe"
import type { BillingProvider, FetchLike } from "./types"

export { applyEvent } from "./apply"
export {
  ACTIVE_STATUSES,
  canUse,
  type Feature,
  PAID_PLANS,
  type PaidPlanId,
  PLANS,
  type PlanId,
  planFor,
} from "./plans"
export type { BillingEvent, BillingProvider } from "./types"

export interface BillingEnv {
  BILLING_PROVIDER?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_PRICE_PRO?: string
  POLAR_ACCESS_TOKEN?: string
  POLAR_WEBHOOK_SECRET?: string
  POLAR_PRODUCT_PRO?: string
  POLAR_SERVER?: string
}

export interface BillingStatus {
  plan: PlanId
  status: string | null
  renewsAt: Date | null
  cancelAtPeriodEnd: boolean
  /** The provider is set up, so checkout and the portal work. */
  configured: boolean
}

export interface Billing {
  provider: BillingProvider["name"] | null
  status(userId: string): Promise<BillingStatus>
  checkout(
    user: { id: string; email: string },
    plan: PaidPlanId,
    urls: { success: string; cancel: string },
  ): Promise<string>
  portal(userId: string, returnUrl: string): Promise<string>
  /** The api route for the provider's webhook: 400 on a bad signature, 200 otherwise. */
  handleWebhook(request: Request): Promise<Response>
}

/** Stripe or Polar, whichever has its keys. `BILLING_PROVIDER` picks when both do. Without keys billing stays off and everyone is on free. */
export function createBilling(env: BillingEnv, db: Db, options: { fetch?: FetchLike; now?: () => Date } = {}): Billing {
  const stripe: StripeOptions | null =
    env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET
      ? {
          secretKey: env.STRIPE_SECRET_KEY,
          webhookSecret: env.STRIPE_WEBHOOK_SECRET,
          prices: { pro: env.STRIPE_PRICE_PRO },
          ...options,
        }
      : null
  const polar: PolarOptions | null =
    env.POLAR_ACCESS_TOKEN && env.POLAR_WEBHOOK_SECRET
      ? {
          accessToken: env.POLAR_ACCESS_TOKEN,
          webhookSecret: env.POLAR_WEBHOOK_SECRET,
          products: { pro: env.POLAR_PRODUCT_PRO },
          server: env.POLAR_SERVER === "sandbox" ? "sandbox" : "production",
          ...options,
        }
      : null
  const wanted = env.BILLING_PROVIDER
  const provider: BillingProvider | null =
    stripe && (wanted !== "polar" || !polar) ? createStripe(stripe) : polar ? createPolar(polar) : null

  const need = () => {
    if (!provider) throw new Error("Billing is not configured: set the Stripe or Polar keys.")
    return provider
  }

  const row = async (userId: string) => (await db.select().from(subscription).where(eq(subscription.userId, userId)))[0]

  return {
    provider: provider?.name ?? null,
    async status(userId) {
      const current = await row(userId)
      return {
        plan: planFor(current),
        status: current?.status ?? null,
        renewsAt: current?.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: current?.cancelAtPeriodEnd ?? false,
        configured: provider !== null,
      }
    },
    async checkout(user, plan, urls) {
      const current = await row(user.id)
      return need().checkout({
        userId: user.id,
        email: user.email,
        plan,
        successUrl: urls.success,
        cancelUrl: urls.cancel,
        customerId: current?.provider === provider?.name ? current?.customerId : undefined,
      })
    },
    async portal(userId, returnUrl) {
      const current = await row(userId)
      if (!current) throw new Error("No subscription to manage yet.")
      return need().portal({ customerId: current.customerId, userId, returnUrl })
    },
    async handleWebhook(request) {
      if (!provider) return Response.json({ message: "Billing is not configured." }, { status: 404 })
      try {
        const event = await provider.parseWebhook(request)
        if (event) await applyEvent(db, provider.name, event)
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Invalid")) {
          return Response.json({ message: error.message }, { status: 400 })
        }
        throw error
      }
      return Response.json({ ok: true })
    },
  }
}
