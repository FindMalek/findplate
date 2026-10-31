import { notes } from "@acme/db"
import { and, sql } from "drizzle-orm"
import { z } from "zod"
import { protectedProcedure } from "../procedures"
import { scope } from "./notes"

export const notesSearchRouter = {
  search: protectedProcedure
    .route({ method: "GET", path: "/notes/search", summary: "Full-text search in your notes", tags: ["notes"] })
    .input(z.object({ q: z.string().trim().min(1).max(100) }))
    .output(z.array(z.object({ id: z.string(), title: z.string(), headline: z.string(), rank: z.number() })))
    .handler(async ({ context, input }) => {
      const query = sql`websearch_to_tsquery('english', ${input.q})`
      return context.db
        .select({
          id: notes.id,
          title: notes.title,
          headline: sql<string>`ts_headline('english', ${notes.body}, ${query}, 'MaxFragments=1,MaxWords=20,MinWords=5,StartSel=<mark>,StopSel=</mark>')`,
          rank: sql<number>`ts_rank(${notes.search}, ${query})`,
        })
        .from(notes)
        .where(and(await scope(context), sql`${notes.search} @@ ${query}`))
        .orderBy(sql`ts_rank(${notes.search}, ${query}) desc`)
        .limit(20)
    }),
}
