import { apiKey } from "@acme/db"
import { ORPCError } from "@orpc/server"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { API_KEY_SCOPES, generateKey } from "../lib/api-keys"
import { audit } from "../lib/audit" // @findplate:audit-log
import { protectedProcedure } from "../procedures"

const keySchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  scope: z.enum(API_KEY_SCOPES),
  lastUsedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
})

/** Keys are managed from a browser session only: a key cannot mint or revoke keys. */
const sessionOnly = protectedProcedure.use(async ({ context, next }) => {
  if (context.apiKey) throw new ORPCError("FORBIDDEN", { message: "Manage keys from the dashboard, not with a key." })
  return next()
})

export const apiKeysRouter = {
  list: sessionOnly
    .route({ method: "GET", path: "/api-keys", summary: "Your active API keys", tags: ["api-keys"] })
    .output(z.array(keySchema))
    .handler(({ context }) =>
      context.db
        .select({
          id: apiKey.id,
          name: apiKey.name,
          prefix: apiKey.prefix,
          scope: apiKey.scope,
          lastUsedAt: apiKey.lastUsedAt,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
        })
        .from(apiKey)
        .where(and(eq(apiKey.userId, context.user.id), isNull(apiKey.revokedAt)))
        .orderBy(desc(apiKey.createdAt))
        .then((rows) =>
          rows.map((row) => ({ ...row, scope: row.scope === "write" ? ("write" as const) : ("read" as const) })),
        ),
    ),

  create: sessionOnly
    .route({ method: "POST", path: "/api-keys", summary: "Create a key, shown once", tags: ["api-keys"] })
    .input(
      z.object({
        name: z.string().trim().min(1).max(60),
        scope: z.enum(API_KEY_SCOPES).default("read"),
        expiresInDays: z.number().int().min(1).max(365).optional(),
      }),
    )
    .output(z.object({ id: z.string(), key: z.string() }))
    .handler(async ({ context, input }) => {
      const { key, prefix, hash } = generateKey()
      const [row] = await context.db
        .insert(apiKey)
        .values({
          userId: context.user.id,
          name: input.name,
          prefix,
          hash,
          scope: input.scope,
          expiresAt: input.expiresInDays ? new Date(context.now().getTime() + input.expiresInDays * 86_400_000) : null,
        })
        .returning({ id: apiKey.id })
      await audit(context, { action: "api-key.create", targetId: row?.id, metadata: { scope: input.scope } }) // @findplate:audit-log
      return { id: row!.id, key }
    }),

  revoke: sessionOnly
    .route({ method: "DELETE", path: "/api-keys/{id}", summary: "Revoke a key", tags: ["api-keys"] })
    .input(z.object({ id: z.uuid() }))
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ context, input }) => {
      await context.db
        .update(apiKey)
        .set({ revokedAt: context.now() })
        .where(and(eq(apiKey.id, input.id), eq(apiKey.userId, context.user.id)))
      await audit(context, { action: "api-key.revoke", targetId: input.id }) // @findplate:audit-log
      return { ok: true as const }
    }),
}
