import { noteInputSchema, noteSchema, noteStatsSchema, noteUpdateSchema } from "@acme/common/schemas"
import { notes } from "@acme/db"
import { ORPCError } from "@orpc/server"
import { generateText } from "ai" // @findplate:ai
import { and, count, desc, eq, type SQL } from "drizzle-orm"
import { z } from "zod"
import type { Context } from "../context"
import { activeOrganizationId } from "../lib/org" // @findplate:orgs
import { protectedProcedure } from "../procedures"

type Caller = Pick<Context, "db" | "session"> & { user: { id: string } }

/** The caller's notes, or the active organization's when the orgs module is on and one is selected. */
async function scope(context: Caller): Promise<SQL | undefined> {
  // @findplate:orgs
  const organizationId = await activeOrganizationId(context)
  if (organizationId) return eq(notes.organizationId, organizationId)
  // @end
  return eq(notes.userId, context.user.id)
}

const mine = async (context: Caller, id: string) => and(await scope(context), eq(notes.id, id))

export const notesRouter = {
  list: protectedProcedure
    .route({ method: "GET", path: "/notes", summary: "The signed-in user's notes", tags: ["notes"] })
    .output(z.array(noteSchema))
    .handler(async ({ context }) =>
      context.db
        .select()
        .from(notes)
        .where(await scope(context))
        .orderBy(desc(notes.pinned), desc(notes.updatedAt)),
    ),

  stats: protectedProcedure
    .route({ method: "GET", path: "/notes/stats", summary: "Counts for the overview", tags: ["notes"] })
    .output(noteStatsSchema)
    .handler(async ({ context }) => {
      const where = await scope(context)
      const [all] = await context.db.select({ n: count() }).from(notes).where(where)
      const [pinned] = await context.db
        .select({ n: count() })
        .from(notes)
        .where(and(where, eq(notes.pinned, true)))
      return { total: all?.n ?? 0, pinned: pinned?.n ?? 0 }
    }),

  create: protectedProcedure
    .route({ method: "POST", path: "/notes", summary: "Create a note", tags: ["notes"] })
    .input(noteInputSchema)
    .output(noteSchema)
    .handler(async ({ context, input }) => {
      const [row] = await context.db
        .insert(notes)
        .values({
          ...input,
          userId: context.user.id,
          organizationId: await activeOrganizationId(context), // @findplate:orgs
        })
        .returning()
      return row!
    }),

  update: protectedProcedure
    .route({ method: "PATCH", path: "/notes/{id}", summary: "Update a note", tags: ["notes"] })
    .input(noteUpdateSchema)
    .output(noteSchema)
    .handler(async ({ context, input: { id, ...patch } }) => {
      const [row] = await context.db
        .update(notes)
        .set({ ...patch, updatedAt: context.now() })
        .where(await mine(context, id))
        .returning()
      if (!row) throw new ORPCError("NOT_FOUND", { message: "Note not found." })
      return row
    }),

  remove: protectedProcedure
    .route({ method: "DELETE", path: "/notes/{id}", summary: "Delete a note", tags: ["notes"] })
    .input(z.object({ id: z.uuid() }))
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ context, input }) => {
      await context.db.delete(notes).where(await mine(context, input.id))
      return { ok: true as const }
    }),

  // @findplate:ai
  summarize: protectedProcedure
    .route({
      method: "POST",
      path: "/notes/{id}/summary",
      summary: "Summarize a note with the AI model",
      tags: ["notes"],
    })
    .input(z.object({ id: z.uuid() }))
    .output(z.object({ summary: z.string() }))
    .handler(async ({ context, input }) => {
      if (!context.model) throw new ORPCError("SERVICE_UNAVAILABLE", { message: "No AI provider key is configured." })
      const [note] = await context.db.select().from(notes).where(await mine(context, input.id))
      if (!note) throw new ORPCError("NOT_FOUND", { message: "Note not found." })
      const { text } = await generateText({
        model: context.model,
        system: "Summarize the note in one short sentence. Plain text, no preamble.",
        prompt: `${note.title}\n\n${note.body}`,
      })
      return { summary: text.trim() }
    }),
  // @end
}
