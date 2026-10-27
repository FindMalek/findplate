import { user } from "@acme/db"
import { ORPCError } from "@orpc/server" // @findplate:storage
import { count, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { adminProcedure, protectedProcedure } from "../procedures"

// @findplate:storage
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
// @end

export const meRouter = {
  get: protectedProcedure
    .route({ method: "GET", path: "/me", summary: "The signed-in user", tags: ["account"] })
    .output(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        image: z.string().nullable(),
        role: z.string().nullable(),
      }),
    )
    .handler(({ context }) => ({
      id: context.user.id,
      name: context.user.name,
      email: context.user.email,
      image: context.user.image ?? null,
      role: context.user.role ?? null,
    })),

  update: protectedProcedure
    .route({ method: "PATCH", path: "/me", summary: "Update your profile", tags: ["account"] })
    .input(z.object({ name: z.string().trim().min(1).max(80) }))
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ context, input }) => {
      await context.db
        .update(user)
        .set({ name: input.name, updatedAt: context.now() })
        .where(eq(user.id, context.user.id))
      return { ok: true as const }
    }),

  // @findplate:storage
  avatar: protectedProcedure
    .route({ method: "POST", path: "/me/avatar", summary: "Upload a profile picture to S3", tags: ["account"] })
    .input(z.object({ file: z.instanceof(File) }))
    .output(z.object({ image: z.string() }))
    .handler(async ({ context, input }) => {
      if (!context.storage) throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Storage isn't configured here." })
      const ext = IMAGE_TYPES[input.file.type]
      if (!ext) throw new ORPCError("UNSUPPORTED_MEDIA_TYPE", { message: "Use a JPEG, PNG or WebP image." })
      if (input.file.size > 4 * 1024 * 1024) throw new ORPCError("PAYLOAD_TOO_LARGE", { message: "4 MB at most." })
      const key = `${context.storage.prefix}avatars/${context.user.id}-${Date.now()}.${ext}`
      await context.storage.put(key, await input.file.arrayBuffer(), input.file.type)
      const image = `/api/files/${key}`
      await context.db.update(user).set({ image, updatedAt: context.now() }).where(eq(user.id, context.user.id))
      return { image }
    }),
  // @end
}

export const adminRouter = {
  users: adminProcedure
    .route({ method: "GET", path: "/admin/users", summary: "All users (admins only)", tags: ["admin"] })
    .output(
      z.object({
        total: z.number(),
        users: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
            role: z.string().nullable(),
            createdAt: z.date(),
          }),
        ),
      }),
    )
    .handler(async ({ context }) => {
      const [total] = await context.db.select({ n: count() }).from(user)
      const users = await context.db
        .select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
        .from(user)
        .orderBy(desc(user.createdAt))
        .limit(100)
      return { total: total?.n ?? 0, users }
    }),
}
