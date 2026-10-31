import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { user } from "./auth"

/** Only the sha256 of a key is stored, the key itself is shown once when it is created. */
export const apiKey = pgTable(
  "api_key",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** First characters of the key, to recognize it in a list. */
    prefix: text("prefix").notNull(),
    hash: text("hash").notNull().unique(),
    /** `read` allows GET and HEAD, `write` everything. */
    scope: text("scope").notNull().default("read"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("api_key_user_idx").on(t.userId)],
)
