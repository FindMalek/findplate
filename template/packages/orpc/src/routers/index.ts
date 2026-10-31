import type { RouterClient } from "@orpc/server"
import { adminRouter, meRouter } from "./account"
import { billingRouter } from "./billing" // @findplate:billing
import { flagsRouter } from "./flags" // @findplate:flags
import { jobsRouter } from "./jobs" // @findplate:jobs
import { notesRouter } from "./notes"
import { notificationRouter } from "./notification" // @findplate:notification
import { publicRouter } from "./public"
import { roadmapRouter } from "./roadmap" // @findplate:roadmap
import { statusRouter } from "./status" // @findplate:status
import { waitlistRouter } from "./waitlist" // @findplate:waitlist

const admin = {
  ...adminRouter,
  notification: notificationRouter, // @findplate:notification
}

/** One router, namespaced: `public` needs no session, everything else does (and `admin` needs the admin role). */
export const appRouter = {
  public: publicRouter,
  me: meRouter,
  notes: notesRouter,
  admin,
  billing: billingRouter, // @findplate:billing
  flags: flagsRouter, // @findplate:flags
  jobs: jobsRouter, // @findplate:jobs
  roadmap: roadmapRouter, // @findplate:roadmap
  status: statusRouter, // @findplate:status
  waitlist: waitlistRouter, // @findplate:waitlist
}

export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<AppRouter>
