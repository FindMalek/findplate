import { sql } from "drizzle-orm" // @findplate:search
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { organization } from "./orgs" // @findplate:orgs
import { tsvector } from "./tsvector" // @findplate:search

/** The example resource: swap it for the project's own domain, it shows the whole path db → orpc → apps. */
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }), // @findplate:orgs
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    pinned: boolean("pinned").notNull().default(false),
    // @findplate:search
    /** Kept up to date by Postgres from title and body, see the `search` procedure. */
    search: tsvector("search").generatedAlwaysAs(sql`to_tsvector('english', title || ' ' || body)`),
    // @end
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // A user's notes, newest first in the dashboard.
    index("notes_user_idx").on(t.userId),
    index("notes_search_idx").using("gin", t.search), // @findplate:search
  ],
)
