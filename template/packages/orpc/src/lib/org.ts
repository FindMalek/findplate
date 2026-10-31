import { member } from "@acme/db"
import { and, eq } from "drizzle-orm"
import type { Context } from "../context"

type Caller = Pick<Context, "db" | "session">

/**
 * The organization the caller works in and their role there. The session only remembers which one is active, so
 * membership is checked again here: someone removed from an organization loses it on their next call.
 */
export async function activeMembership(context: Caller): Promise<{ organizationId: string; role: string } | null> {
  const organizationId = context.session?.session.activeOrganizationId
  const userId = context.session?.user.id
  if (!organizationId || !userId) return null
  const [row] = await context.db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
  return row ? { organizationId, role: row.role } : null
}

export async function activeOrganizationId(context: Caller): Promise<string | null> {
  return (await activeMembership(context))?.organizationId ?? null
}
