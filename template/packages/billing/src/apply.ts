import { billingEvent, type Db, subscription } from "@acme/db"
import { eq, sql } from "drizzle-orm"
import type { BillingEvent } from "./types"

export type ApplyResult = "applied" | "duplicate" | "unknown-user"

/** Applies one provider event. Delivered twice it does nothing, delivered late it never overwrites newer state. */
export async function applyEvent(db: Db, provider: string, event: BillingEvent): Promise<ApplyResult> {
  return db.transaction(async (tx) => {
    const fresh = await tx
      .insert(billingEvent)
      .values({ id: event.id, type: event.type })
      .onConflictDoNothing()
      .returning()
    if (fresh.length === 0) return "duplicate"

    let userId = event.userId
    if (!userId) {
      const [known] = await tx
        .select({ userId: subscription.userId })
        .from(subscription)
        .where(eq(subscription.subscriptionId, event.subscriptionId))
      userId = known?.userId ?? null
    }
    if (!userId) return "unknown-user"

    const values = {
      userId,
      provider,
      customerId: event.customerId,
      subscriptionId: event.subscriptionId,
      plan: event.plan,
      status: event.status,
      currentPeriodEnd: event.currentPeriodEnd,
      cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      eventAt: event.occurredAt,
    }
    await tx
      .insert(subscription)
      .values(values)
      .onConflictDoUpdate({
        target: subscription.userId,
        set: { ...values, updatedAt: sql`now()` },
        setWhere: sql`${subscription.eventAt} <= ${event.occurredAt.toISOString()}`,
      })
    return "applied"
  })
}
