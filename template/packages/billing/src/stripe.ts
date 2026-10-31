import { hmacSha256, safeEqual } from "@acme/webhooks"
import { PAID_PLANS, type PaidPlanId } from "./plans"
import type { BillingEvent, BillingProvider, FetchLike } from "./types"

const API = "https://api.stripe.com/v1"
const TOLERANCE_SECONDS = 300

export interface StripeOptions {
  secretKey: string
  webhookSecret: string
  /** Stripe price id per paid plan. */
  prices: Record<PaidPlanId, string | undefined>
  fetch?: FetchLike
  now?: () => Date
}

/** Stripe's REST api takes form bodies, nested keys as `a[b]`. */
function form(values: Record<string, string | undefined>): string {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value !== undefined) body.set(key, value)
  return body.toString()
}

interface StripeSubscription {
  id: string
  customer: string
  status: string
  cancel_at_period_end: boolean
  current_period_end?: number
  items?: { data: { price: { id: string }; current_period_end?: number }[] }
  metadata?: { userId?: string; plan?: string }
}

export function verifyStripeSignature(options: {
  secret: string
  body: string
  header: string | null
  now?: () => Date
}): boolean {
  if (!options.header) return false
  const parts = Object.fromEntries(options.header.split(",").map((part) => part.split("=") as [string, string]))
  const timestamp = parts.t
  const sent = Number(timestamp)
  if (!timestamp || !Number.isFinite(sent)) return false
  const now = (options.now ?? (() => new Date()))()
  if (Math.abs(now.getTime() / 1000 - sent) > TOLERANCE_SECONDS) return false
  return safeEqual(parts.v1 ?? "", hmacSha256(options.secret, `${timestamp}.${options.body}`))
}

export function createStripe(options: StripeOptions): BillingProvider {
  const call = options.fetch ?? fetch
  const authorization = `Bearer ${options.secretKey}`

  async function post(path: string, values: Record<string, string | undefined>): Promise<{ url: string }> {
    const response = await call(`${API}${path}`, {
      method: "POST",
      headers: { authorization, "content-type": "application/x-www-form-urlencoded" },
      body: form(values),
    })
    if (!response.ok) throw new Error(`Stripe ${path} answered ${response.status}`)
    return (await response.json()) as { url: string }
  }

  const planOfPrice = (priceId: string | undefined): string =>
    PAID_PLANS.find((plan) => options.prices[plan] === priceId) ?? "free"

  return {
    name: "stripe",
    async checkout(input) {
      const price = options.prices[input.plan]
      if (!price) throw new Error(`No Stripe price set for the ${input.plan} plan.`)
      const session = await post("/checkout/sessions", {
        mode: "subscription",
        "line_items[0][price]": price,
        "line_items[0][quantity]": "1",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.userId,
        customer: input.customerId,
        customer_email: input.customerId ? undefined : input.email,
        "subscription_data[metadata][userId]": input.userId,
      })
      return session.url
    },
    async portal(input) {
      const session = await post("/billing_portal/sessions", {
        customer: input.customerId,
        return_url: input.returnUrl,
      })
      return session.url
    },
    async parseWebhook(request) {
      const body = await request.text()
      if (
        !verifyStripeSignature({
          secret: options.webhookSecret,
          body,
          header: request.headers.get("stripe-signature"),
          now: options.now,
        })
      ) {
        throw new Error("Invalid Stripe signature.")
      }
      const event = JSON.parse(body) as {
        id: string
        type: string
        created: number
        data: { object: StripeSubscription }
      }
      if (!event.type.startsWith("customer.subscription.")) return null
      const subscription = event.data.object
      const item = subscription.items?.data[0]
      const periodEnd = subscription.current_period_end ?? item?.current_period_end
      return {
        id: event.id,
        type: event.type,
        occurredAt: new Date(event.created * 1000),
        userId: subscription.metadata?.userId ?? null,
        customerId: subscription.customer,
        subscriptionId: subscription.id,
        plan: planOfPrice(item?.price.id),
        status: subscription.status,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      } satisfies BillingEvent
    },
  }
}
