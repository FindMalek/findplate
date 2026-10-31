import { notes, user } from "@acme/db"
import { ORPCError } from "@orpc/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { audit } from "../lib/audit" // @findplate:audit-log
import { protectedProcedure } from "../procedures"

export const privacyRouter = {
  export: protectedProcedure
    .route({
      method: "GET",
      path: "/privacy/export",
      summary: "Everything stored about you, as json",
      tags: ["privacy"],
    })
    .output(z.object({ exportedAt: z.date(), data: z.record(z.string(), z.unknown()) }))
    .handler(async ({ context }) => {
      const [profile] = await context.db
        .select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt })
        .from(user)
        .where(eq(user.id, context.user.id))
      const owned = await context.db.select().from(notes).where(eq(notes.userId, context.user.id))
      await audit(context, { action: "privacy.export", targetId: context.user.id }) // @findplate:audit-log
      return { exportedAt: context.now(), data: { profile, notes: owned } }
    }),

  deleteAccount: protectedProcedure
    .route({
      method: "DELETE",
      path: "/privacy/account",
      summary: "Delete your account and its data",
      tags: ["privacy"],
    })
    .input(z.object({ email: z.string() }))
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ context, input }) => {
      if (input.email.trim().toLowerCase() !== context.user.email.toLowerCase()) {
        throw new ORPCError("BAD_REQUEST", { message: "Type your email address to confirm." })
      }
      await audit(context, { action: "privacy.delete-account", targetId: context.user.id }) // @findplate:audit-log
      await context.db.delete(user).where(eq(user.id, context.user.id))
      return { ok: true as const }
    }),
}
