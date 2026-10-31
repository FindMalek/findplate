import type { Auth, Session } from "@acme/auth"
import type { Cache } from "@acme/cache" // @findplate:cache
import type { Db } from "@acme/db"
import type { Flags } from "@acme/flags/server" // @findplate:flags
import type { Jobs } from "@acme/jobs" // @findplate:jobs
import type { Notifier } from "@acme/notification" // @findplate:notification
import type { Storage } from "@acme/storage" // @findplate:storage
import type { LanguageModel } from "ai" // @findplate:ai
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

export type Context = Services & { headers: Headers; session: Session | null }

export async function createContext(services: Services, headers: Headers): Promise<Context> {
  const session = await services.auth.api.getSession({ headers }).catch(() => null)
  return { ...services, headers, session }
}
