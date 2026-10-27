import { nextEnv } from "@acme/env/next"
import * as Sentry from "@sentry/nextjs"

export function register() {
  Sentry.init({ dsn: nextEnv().NEXT_PUBLIC_GLITCHTIP_DSN, tracesSampleRate: 0 })
}

export const onRequestError = Sentry.captureRequestError
