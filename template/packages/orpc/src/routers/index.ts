import type { RouterClient } from "@orpc/server"
import { adminRouter, meRouter } from "./account"
import { emailRouter } from "./email" // @findplate:email
import { notesRouter } from "./notes"
import { publicRouter } from "./public"

/** One router, namespaced: `public` needs no session, everything else does (and `admin` needs the admin role). */
export const appRouter = {
  public: publicRouter,
  me: meRouter,
  notes: notesRouter,
  admin: adminRouter,
  // @findplate:email
  email: emailRouter,
  // @end
}

export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<AppRouter>
