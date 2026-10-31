import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"

/** Overrides edited in the dashboard. A flag without a row uses its default from `@acme/flags`. */
export const featureFlag = pgTable("feature_flag", {
  name: text("name").primaryKey(),
  /** 0 is off, 100 is on for everyone, in between is that share of signed-in users. */
  rollout: integer("rollout").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
