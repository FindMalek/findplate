import { auditLog } from "@acme/db"
import type { Context } from "../context"

export interface AuditEntry {
  /** `noun.verb`, e.g. `note.delete`. */
  action: string
  targetId?: string
  metadata?: Record<string, unknown>
}

/** Records what the caller just did. A failing audit write is logged, never allowed to fail the action itself. */
export async function audit(context: Pick<Context, "db" | "session" | "headers">, entry: AuditEntry): Promise<void> {
  const forwarded = context.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  try {
    await context.db.insert(auditLog).values({
      actorId: context.session?.user.id ?? null,
      action: entry.action,
      targetId: entry.targetId,
      metadata: entry.metadata,
      ip: forwarded || context.headers.get("x-real-ip"),
    })
  } catch (error) {
    console.error("[audit]", entry.action, error)
  }
}
