import type { RouterClient } from "@orpc/server"
import { adminRouter, meRouter } from "./account"
import { notesRouter } from "./notes"
import { publicRouter } from "./public"
import { telegramRouter } from "./telegram" // @findplate:telegram

/** One router, namespaced: `public` needs no session, everything else does (and `admin` needs the admin role). */
export const appRouter = {
  public: publicRouter,
  me: meRouter,
  notes: notesRouter,
  admin: adminRouter,
  // @findplate:telegram
  telegram: telegramRouter,
  // @end
}

export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<AppRouter>
