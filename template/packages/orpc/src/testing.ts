import { createAuth } from "@acme/auth"
import { createBilling } from "@acme/billing" // @findplate:billing
import { createCache } from "@acme/cache" // @findplate:cache
import { user } from "@acme/db"
import { createTestDb, type TestDb } from "@acme/db/testing"
import { createFlags } from "@acme/flags/server" // @findplate:flags
import { createNotifier } from "@acme/notification" // @findplate:notification
import { createRouterClient } from "@orpc/server"
import { eq } from "drizzle-orm"
import { createContext, type Services } from "./context"
import { createRateLimiter } from "./lib/rate-limit" // @findplate:rate-limit
import { appRouter } from "./routers"

const SECRET = "test-secret-test-secret-test-secret!"
const PASSWORD = "correct horse battery"

/** The real services on a throwaway Postgres database: real auth, real router, only the outside world (mail, s3, models) is off. */
export async function createTestApp() {
  const testDb: TestDb = await createTestDb()
  const auth = createAuth({
    db: testDb.db,
    secret: SECRET,
    dashboardUrl: "http://localhost:3002",
    trustedOrigins: ["http://localhost:3002"],
    secureCookies: false,
  })
  const services: Services = {
    db: testDb.db,
    auth,
    now: () => new Date(),
    config: {
      deployEnv: "test",
      githubAuth: false,
      webUrl: "http://localhost:3000", // @findplate:status
      dashboardUrl: "http://localhost:3002", // @findplate:status
    },
    rateLimiter: createRateLimiter({}), // @findplate:rate-limit
    cache: createCache({}), // @findplate:cache
    // @findplate:storage
    storage: null,
    // @end
    billing: createBilling({}, testDb.db), // @findplate:billing
    flags: createFlags({ db: testDb.db }), // @findplate:flags
    jobs: { enqueue: async () => ({ ok: true, id: null }), list: async () => [] }, // @findplate:jobs
    // @findplate:notification
    notification: createNotifier({}),
    // @end
    // @findplate:ai
    model: null,
    // @end
  }

  const clientFor = (headers: Headers) =>
    createRouterClient(appRouter, { context: () => createContext(services, headers) })

  /** Signs a user up and in, as the dashboard does, and returns a client carrying their session cookie. */
  async function signUp(email: string, options: { role?: "admin" } = {}) {
    const created = await auth.api.signUpEmail({
      body: { email, password: PASSWORD, name: email.split("@")[0] ?? email },
    })
    if (options.role) await services.db.update(user).set({ role: options.role }).where(eq(user.id, created.user.id))
    const login = await auth.api.signInEmail({ body: { email, password: PASSWORD }, returnHeaders: true })
    const headers = new Headers({
      cookie: login.headers
        .getSetCookie()
        .map((cookie) => cookie.split(";")[0])
        .join("; "),
      "x-csrf-token": "orpc",
    })
    return { id: created.user.id, headers, client: clientFor(headers) }
  }

  return {
    services,
    anonymous: clientFor(new Headers({ "x-csrf-token": "orpc" })),
    clientFor,
    signUp,
    password: PASSWORD,
    close: testDb.close,
  }
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>
