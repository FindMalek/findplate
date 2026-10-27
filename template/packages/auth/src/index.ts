import type { Db } from "@acme/db"
import * as schema from "@acme/db/schema"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins"

export interface AuthConfig {
  db: Db
  secret: string
  /** Public url of the dashboard: auth is served under its `/api/auth` proxy, so cookies stay first-party. */
  dashboardUrl: string
  trustedOrigins: string[]
  github?: { clientId: string; clientSecret: string }
  secureCookies: boolean
}

export function createAuth(config: AuthConfig) {
  return betterAuth({
    baseURL: config.dashboardUrl,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: drizzleAdapter(config.db, { provider: "pg", schema }),
    emailAndPassword: { enabled: true, minPasswordLength: 10 },
    socialProviders: config.github ? { github: config.github } : undefined,
    plugins: [admin()],
    advanced: { useSecureCookies: config.secureCookies },
    session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  })
}

export type Auth = ReturnType<typeof createAuth>
export type Session = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>
