import type { Auth, Session } from "@acme/auth"
import type { Db } from "@acme/db"
import type { Mailer } from "@acme/email" // @findplate:email
import type { Storage } from "@acme/storage" // @findplate:storage
import type { Telegram } from "@acme/telegram" // @findplate:telegram
import type { WhatsApp } from "@acme/whatsapp" // @findplate:whatsapp
import type { LanguageModel } from "ai" // @findplate:ai

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
  // @findplate:storage
  storage: Storage | null
  // @end
  // @findplate:whatsapp
  whatsapp: WhatsApp | null
  // @end
  // @findplate:telegram
  telegram: Telegram | null
  // @end
  // @findplate:email
  mailer: Mailer | null
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
