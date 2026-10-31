import { inboxItem } from "@acme/db"
import { and, count, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { notifyInbox } from "../lib/inbox"
import { adminProcedure, protectedProcedure } from "../procedures"

const itemSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  href: z.string().nullable(),
  readAt: z.date().nullable(),
  createdAt: z.date(),
})

const LIMIT = 30

export const inboxRouter = {
  list: protectedProcedure
    .route({ method: "GET", path: "/inbox", summary: "Your latest notifications", tags: ["inbox"] })
    .output(z.object({ unread: z.number(), items: z.array(itemSchema) }))
    .handler(async ({ context }) => {
      const [unread] = await context.db
        .select({ n: count() })
        .from(inboxItem)
        .where(and(eq(inboxItem.userId, context.user.id), isNull(inboxItem.readAt)))
      const items = await context.db
        .select({
          id: inboxItem.id,
          title: inboxItem.title,
          body: inboxItem.body,
          href: inboxItem.href,
          readAt: inboxItem.readAt,
          createdAt: inboxItem.createdAt,
        })
        .from(inboxItem)
        .where(eq(inboxItem.userId, context.user.id))
        .orderBy(desc(inboxItem.createdAt))
        .limit(LIMIT)
      return { unread: unread?.n ?? 0, items }
    }),

  markRead: protectedProcedure
    .route({ method: "POST", path: "/inbox/{id}/read", summary: "Mark one notification read", tags: ["inbox"] })
    .input(z.object({ id: z.uuid() }))
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ context, input }) => {
      await context.db
        .update(inboxItem)
        .set({ readAt: context.now() })
        .where(and(eq(inboxItem.id, input.id), eq(inboxItem.userId, context.user.id), isNull(inboxItem.readAt)))
      return { ok: true as const }
    }),

  markAllRead: protectedProcedure
    .route({ method: "POST", path: "/inbox/read", summary: "Mark all notifications read", tags: ["inbox"] })
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ context }) => {
      await context.db
        .update(inboxItem)
        .set({ readAt: context.now() })
        .where(and(eq(inboxItem.userId, context.user.id), isNull(inboxItem.readAt)))
      return { ok: true as const }
    }),
}

export const inboxAdminRouter = {
  send: adminProcedure
    .route({ method: "POST", path: "/admin/inbox", summary: "Send a notification to a user", tags: ["admin"] })
    .input(
      z.object({ userId: z.string(), title: z.string().trim().min(1).max(120), body: z.string().max(500).optional() }),
    )
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ context, input }) => {
      await notifyInbox(context.db, input.userId, { title: input.title, body: input.body })
      return { ok: true as const }
    }),
}
