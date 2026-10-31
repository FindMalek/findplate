/** Plans live in code. The paid ones map to a price (Stripe) or product (Polar) id in env, see `docs/billing`. */
export const PLANS = {
  free: { label: "Free", features: ["notes"] },
  pro: { label: "Pro", features: ["notes", "export", "priority-support"] },
} as const

export type PlanId = keyof typeof PLANS
export type Feature = (typeof PLANS)[PlanId]["features"][number]

export const PAID_PLANS = ["pro"] as const satisfies readonly PlanId[]
export type PaidPlanId = (typeof PAID_PLANS)[number]

export const isPlanId = (value: string): value is PlanId => value in PLANS

/** `canUse("pro", "export")`: the entitlement check to gate a feature, server or client side. */
export function canUse(plan: PlanId, feature: Feature): boolean {
  return (PLANS[plan].features as readonly string[]).includes(feature)
}

/** Subscription statuses that still give the paid plan. A failed payment keeps it while the provider retries (`past_due`). */
export const ACTIVE_STATUSES = ["active", "trialing", "past_due"] as const

export function planFor(row: { plan: string; status: string } | undefined): PlanId {
  if (!row || !isPlanId(row.plan)) return "free"
  return (ACTIVE_STATUSES as readonly string[]).includes(row.status) ? row.plan : "free"
}
