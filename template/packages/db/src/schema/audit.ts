import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { user } from "./auth"

/** Append only: nothing in the api updates or deletes a row. Who did what, from where, when. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null for the system, and kept (as null) when the user is deleted. */
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    /** `noun.verb`, e.g. `note.delete`. */
    action: text("action").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt), index("audit_log_actor_idx").on(t.actorId)],
)
