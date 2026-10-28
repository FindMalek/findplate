import { session } from "@acme/db"
import { lt } from "drizzle-orm"
import { z } from "zod"
import { defineJob } from "../define"

/** Expired better-auth sessions are never read again, so a nightly sweep keeps the table small. */
export const cleanupSessions = defineJob({
  name: "cleanup-sessions",
  description: "Delete expired sessions",
  payload: z.object({}),
  cron: "0 3 * * *",
  scheduleData: {},
  handler: async (_payload, { db, now }) => {
    const removed = await db.delete(session).where(lt(session.expiresAt, now())).returning({ id: session.id })
    console.info(`cleanup-sessions removed ${removed.length} sessions`)
  },
})
