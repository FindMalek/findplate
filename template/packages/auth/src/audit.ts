import { auditLog, type Db } from "@acme/db"
import { createAuthMiddleware } from "better-auth/api"

/** Writes admin impersonation to the audit log: who started it as whom, and when they stopped. */
export function auditHooks(db: Db) {
  return {
    databaseHooks: {
      session: {
        create: {
          after: async (session: { userId: string; impersonatedBy?: string | null }) => {
            if (!session.impersonatedBy) return
            await db
              .insert(auditLog)
              .values({ actorId: session.impersonatedBy, action: "admin.impersonate", targetId: session.userId })
          },
        },
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/admin/stop-impersonating") return
        const adminId = ctx.context.newSession?.user.id
        if (adminId) await db.insert(auditLog).values({ actorId: adminId, action: "admin.impersonate-stop" })
      }),
    },
  }
}
