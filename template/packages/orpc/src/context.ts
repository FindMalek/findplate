import type { Auth, Session } from "@acme/auth"
import type { Billing } from "@acme/billing" // @findplate:billing
import type { Cache } from "@acme/cache" // @findplate:cache
import type { Db } from "@acme/db"
import type { Flags } from "@acme/flags/server" // @findplate:flags
import type { Jobs } from "@acme/jobs" // @findplate:jobs
import type { Notifier } from "@acme/notification" // @findplate:notification
import type { Storage } from "@acme/storage" // @findplate:storage
import type { LanguageModel } from "ai" // @findplate:ai
import { authenticateKey } from "./lib/api-keys" // @findplate:api-keys
import type { RateLimiter } from "./lib/rate-limit" // @findplate:rate-limit

/** Everything procedures need, built once by the api at startup (and by tests with their own). */
export interface Services {
  db: Db
  auth: Auth
  now: () => Date
  config: {
    deployEnv: string
    githubAuth: boolean
    githubRepo?: string
    githubToken?: string
    webUrl: string // @findplate:status
    dashboardUrl: string // @findplate:status
  }
  rateLimiter: RateLimiter // @findplate:rate-limit
  cache: Cache // @findplate:cache
  billing: Billing // @findplate:billing
  flags: Flags // @findplate:flags
  jobs: Jobs // @findplate:jobs
  // @findplate:storage
  storage: Storage | null
  // @end
  // @findplate:notification
  notification: Notifier
  // @end
  // @findplate:ai
  model: LanguageModel | null
  // @end
}

export type Context = Services & {
  headers: Headers
  session: Session | null
  /** Set when the call authenticated with an API key (api-keys module) instead of a browser session. */
  apiKey: { id: string; scope: "read" | "write" } | null
}

export async function createContext(services: Services, headers: Headers): Promise<Context> {
  const session = await services.auth.api.getSession({ headers }).catch(() => null)
  // @findplate:api-keys
  const key = session ? null : await authenticateKey(services.db, headers, services.now())
  if (key) return { ...services, headers, session: key.session, apiKey: { id: key.id, scope: key.scope } }
  // @end
  return { ...services, headers, session, apiKey: null }
}
