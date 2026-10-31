import type { RouterClient } from "@orpc/server"
import { adminRouter, meRouter } from "./account"
import { apiKeysRouter } from "./api-keys" // @findplate:api-keys
import { auditRouter } from "./audit" // @findplate:audit-log
import { billingRouter } from "./billing" // @findplate:billing
import { flagsRouter } from "./flags" // @findplate:flags
import { inboxAdminRouter, inboxRouter } from "./inbox" // @findplate:inbox
import { jobsRouter } from "./jobs" // @findplate:jobs
import { notesRouter } from "./notes"
import { notificationRouter } from "./notification" // @findplate:notification
import { publicRouter } from "./public"
import { roadmapRouter } from "./roadmap" // @findplate:roadmap
import { statusRouter } from "./status" // @findplate:status
import { waitlistRouter } from "./waitlist" // @findplate:waitlist

const admin = {
  ...adminRouter,
  inbox: inboxAdminRouter, // @findplate:inbox
  audit: auditRouter, // @findplate:audit-log
  notification: notificationRouter, // @findplate:notification
}

/** One router, namespaced: `public` needs no session, everything else does (and `admin` needs the admin role). */
export const appRouter = {
  public: publicRouter,
  me: meRouter,
  notes: notesRouter,
  admin,
  apiKeys: apiKeysRouter, // @findplate:api-keys
  billing: billingRouter, // @findplate:billing
  flags: flagsRouter, // @findplate:flags
  inbox: inboxRouter, // @findplate:inbox
  jobs: jobsRouter, // @findplate:jobs
  roadmap: roadmapRouter, // @findplate:roadmap
  status: statusRouter, // @findplate:status
  waitlist: waitlistRouter, // @findplate:waitlist
}

export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<AppRouter>
