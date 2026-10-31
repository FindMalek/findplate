import { verifySvix } from "@acme/webhooks"
import { PAID_PLANS, type PaidPlanId } from "./plans"
import type { BillingEvent, BillingProvider, FetchLike } from "./types"

const HOSTS = { production: "https://api.polar.sh", sandbox: "https://sandbox-api.polar.sh" } as const

export interface PolarOptions {
  accessToken: string
  webhookSecret: string
  /** Polar product id per paid plan. */
  products: Record<PaidPlanId, string | undefined>
  server?: keyof typeof HOSTS
  fetch?: FetchLike
  now?: () => Date
}

interface PolarSubscription {
  id: string
  status: string
  product_id: string
  customer_id: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  customer?: { external_id?: string | null }
  metadata?: { userId?: string }
}

export function createPolar(options: PolarOptions): BillingProvider {
  const call = options.fetch ?? fetch
  const host = HOSTS[options.server ?? "production"]

  async function post(path: string, body: unknown): Promise<Record<string, string>> {
    const response = await call(`${host}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${options.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(`Polar ${path} answered ${response.status}`)
    return (await response.json()) as Record<string, string>
  }

  return {
    name: "polar",
    async checkout(input) {
      const product = options.products[input.plan]
      if (!product) throw new Error(`No Polar product set for the ${input.plan} plan.`)
      const checkout = await post("/v1/checkouts/", {
        products: [product],
        external_customer_id: input.userId,
        customer_email: input.email,
        success_url: input.successUrl,
        metadata: { userId: input.userId },
      })
      return checkout.url as string
    },
    async portal(input) {
      const session = await post("/v1/customer-sessions/", { external_customer_id: input.userId })
      return session.customer_portal_url as string
    },
    async parseWebhook(request) {
      const body = await request.text()
      // Polar follows standard-webhooks (the svix scheme under `webhook-*` header names) and signs with the base64 of its secret.
      const headers = new Headers({
        "svix-id": request.headers.get("webhook-id") ?? "",
        "svix-timestamp": request.headers.get("webhook-timestamp") ?? "",
        "svix-signature": request.headers.get("webhook-signature") ?? "",
      })
      const secret = Buffer.from(options.webhookSecret).toString("base64")
      if (!verifySvix({ secret, headers, body, now: options.now })) throw new Error("Invalid Polar signature.")
      const event = JSON.parse(body) as { type: string; timestamp?: string; data: PolarSubscription }
      if (!event.type.startsWith("subscription.")) return null
      const subscription = event.data
      return {
        id: headers.get("svix-id") || `${event.type}:${subscription.id}`,
        type: event.type,
        occurredAt: event.timestamp ? new Date(event.timestamp) : (options.now ?? (() => new Date()))(),
        userId: subscription.customer?.external_id ?? subscription.metadata?.userId ?? null,
        customerId: subscription.customer_id,
        subscriptionId: subscription.id,
        plan: PAID_PLANS.find((plan) => options.products[plan] === subscription.product_id) ?? "free",
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      } satisfies BillingEvent
    },
  }
}
