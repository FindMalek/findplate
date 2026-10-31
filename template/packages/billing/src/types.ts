import type { PaidPlanId } from "./plans"

/** What every provider boils its webhooks down to, so the rest of the module never sees a vendor payload. */
export interface BillingEvent {
  /** The provider's event id, stored to make delivery idempotent. */
  id: string
  type: string
  /** When the provider says it happened, so a late retry never beats a newer event. */
  occurredAt: Date
  /** Our user id, from the checkout metadata. */
  userId: string | null
  customerId: string
  subscriptionId: string
  plan: string
  /** `active`, `trialing`, `past_due`, `canceled`, ... as the provider names them. */
  status: string
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

export interface CheckoutInput {
  userId: string
  email: string
  plan: PaidPlanId
  successUrl: string
  cancelUrl: string
  /** Known customer, so a second checkout reuses it. */
  customerId?: string
}

export interface BillingProvider {
  name: "stripe" | "polar"
  checkout(input: CheckoutInput): Promise<string>
  portal(input: { customerId: string; userId: string; returnUrl: string }): Promise<string>
  /** Verifies the signature of the raw request and normalizes it. `null` is an event we don't care about. */
  parseWebhook(request: Request): Promise<BillingEvent | null>
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>
