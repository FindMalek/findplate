import { waitlist } from "@acme/db"
import { count, desc } from "drizzle-orm"
import { z } from "zod"
import { adminProcedure, publicProcedure } from "../procedures"

export const waitlistRouter = {
  join: publicProcedure
    .route({ method: "POST", path: "/waitlist", summary: "Join the waitlist", tags: ["waitlist"] })
    .input(z.object({ email: z.email().max(254).toLowerCase() }))
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ context, input }) => {
      await context.db.insert(waitlist).values({ email: input.email }).onConflictDoNothing()
      return { ok: true as const }
    }),

  list: adminProcedure
    .route({ method: "GET", path: "/admin/waitlist", summary: "Waitlist signups (admins only)", tags: ["waitlist"] })
    .output(
      z.object({
        total: z.number(),
        entries: z.array(z.object({ id: z.string(), email: z.string(), createdAt: z.date() })),
      }),
    )
    .handler(async ({ context }) => {
      const [total] = await context.db.select({ n: count() }).from(waitlist)
      const entries = await context.db.select().from(waitlist).orderBy(desc(waitlist.createdAt)).limit(200)
      return { total: total?.n ?? 0, entries }
    }),
}
