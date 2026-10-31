import { type CheckResult, isLocalHost, type Status } from "./doctor-plan"

export interface SecurityInput {
  env: Record<string, string>
  /** Source of the auth config, undefined when the file is missing. */
  authSource?: string
  /** next.config.* files of the apps, by relative path. */
  nextConfigs: Record<string, string>
  /** True when `.env` is tracked by git. */
  envTracked: boolean
  /** True when the api has its rate limiter wired in. */
  rateLimited: boolean
}

const WEAK = /^(change[-_]?me|secret|password|admin|admin123|12345678|test|dev|example|default)/i
const MIN_SECRET = 32
const MIN_PASSWORD = 10

const result = (id: string, label: string, status: Status, detail: string): CheckResult => ({
  id,
  label,
  status,
  detail,
})

export function isProduction(env: Record<string, string>): boolean {
  if (env.NODE_ENV === "production") return true
  try {
    return Boolean(env.DASHBOARD_URL) && !isLocalHost(new URL(env.DASHBOARD_URL as string).hostname)
  } catch {
    return false
  }
}

export function securityChecks(input: SecurityInput): CheckResult[] {
  const { env } = input
  const prod = isProduction(env)
  const out: CheckResult[] = []

  const secret = env.BETTER_AUTH_SECRET ?? ""
  out.push(
    !secret || WEAK.test(secret) || secret.length < MIN_SECRET
      ? result(
          "sec-secret",
          "auth secret",
          "fail",
          `BETTER_AUTH_SECRET is empty, a placeholder or under ${MIN_SECRET} chars, set it to the output of openssl rand -base64 32`,
        )
      : result("sec-secret", "auth secret", "pass", "BETTER_AUTH_SECRET looks strong"),
  )

  const password = env.ADMIN_PASSWORD ?? ""
  out.push(
    !password || WEAK.test(password) || password.length < MIN_PASSWORD
      ? result(
          "sec-admin",
          "admin password",
          "fail",
          `ADMIN_PASSWORD is empty, a default or under ${MIN_PASSWORD} chars, set a unique one and restart the api`,
        )
      : result("sec-admin", "admin password", "pass", "ADMIN_PASSWORD is not a default"),
  )

  if (input.authSource === undefined) out.push(result("sec-signup", "open signup", "skip", "packages/auth not found"))
  else {
    const open = /emailAndPassword/.test(input.authSource) && !/disableSignUp:\s*true/.test(input.authSource)
    out.push(
      open
        ? result(
            "sec-signup",
            "open signup",
            prod ? "fail" : "warn",
            "anyone can register, set disableSignUp: true under emailAndPassword in packages/auth/src/index.ts if the app is invite only",
          )
        : result("sec-signup", "open signup", "pass", "signup is closed"),
    )
  }

  const configs = Object.entries(input.nextConfigs)
  if (!configs.length) out.push(result("sec-headers", "security headers", "skip", "no next.config found"))
  else {
    const lacking = configs.filter(([, text]) => !/Content-Security-Policy/.test(text))
    out.push(
      lacking.length
        ? result(
            "sec-headers",
            "security headers",
            "fail",
            `no Content-Security-Policy header in ${lacking.map(([file]) => file).join(", ")}, add it to headers() in next.config.ts`,
          )
        : result("sec-headers", "security headers", "pass", "csp set in every next.config"),
    )
  }

  out.push(
    input.envTracked
      ? result(
          "sec-env",
          ".env tracked",
          "fail",
          ".env is committed, run git rm --cached .env, add it to .gitignore and rotate its secrets",
        )
      : result("sec-env", ".env tracked", "pass", ".env is not tracked by git"),
  )

  out.push(
    input.rateLimited
      ? result("sec-rate-limit", "auth rate limit", "pass", "auth routes are rate limited")
      : result(
          "sec-rate-limit",
          "auth rate limit",
          "fail",
          "auth routes have no rate limit, run findplate add rate-limit",
        ),
  )
  return out
}
