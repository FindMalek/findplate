import { ADMIN_LIST_LIMIT } from "@acme/common/constants"
import { auditLog, user } from "@acme/db"
import { and, desc, eq, ilike } from "drizzle-orm"
import { z } from "zod"
import { adminProcedure } from "../procedures"

const entrySchema = z.object({
  id: z.string(),
  actorId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  action: z.string(),
  targetId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  ip: z.string().nullable(),
  createdAt: z.date(),
})

export const auditRouter = {
  list: adminProcedure
    .route({
      method: "GET",
      path: "/admin/audit",
      summary: "The audit log, newest first (admins only)",
      tags: ["admin"],
    })
    .input(z.object({ action: z.string().trim().max(80).optional(), actorId: z.string().optional() }).default({}))
    .output(z.array(entrySchema))
    .handler(({ context, input }) =>
      context.db
        .select({
          id: auditLog.id,
          actorId: auditLog.actorId,
          actorEmail: user.email,
          action: auditLog.action,
          targetId: auditLog.targetId,
          metadata: auditLog.metadata,
          ip: auditLog.ip,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .leftJoin(user, eq(user.id, auditLog.actorId))
        .where(
          and(
            input.action ? ilike(auditLog.action, `${input.action.replace(/[\\%_]/g, "\\$&")}%`) : undefined,
            input.actorId ? eq(auditLog.actorId, input.actorId) : undefined,
          ),
        )
        .orderBy(desc(auditLog.createdAt))
        .limit(ADMIN_LIST_LIMIT),
    ),
}
