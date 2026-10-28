import { nextEnv } from "@acme/env/next" // @findplate:glitchtip
import * as Sentry from "@sentry/nextjs" // @findplate:glitchtip
import type { Instrumentation } from "next"

/** Modules such as logger and glitchtip hook in here: Next runs `register` once when the server starts. */
const startups: Array<() => void | Promise<void>> = []
// @findplate:logger
startups.push(async () => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { nextEnv: loadEnv } = await import("@acme/env/next")
  const { registerLogger } = await import("@acme/logger/next")
  registerLogger({ level: loadEnv().LOG_LEVEL })
})
// @end
// @findplate:glitchtip
startups.push(() => {
  Sentry.init({ dsn: nextEnv().NEXT_PUBLIC_GLITCHTIP_DSN })
})
// @end

const requestErrorHandlers: Instrumentation.onRequestError[] = []
requestErrorHandlers.push(Sentry.captureRequestError) // @findplate:glitchtip
// @findplate:logger
requestErrorHandlers.push(async (...args) => {
  if (process.env.NEXT_RUNTIME === "nodejs") (await import("@acme/logger/next")).logRequestError(...args)
})
// @end

export async function register() {
  for (const start of startups) await start()
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  await Promise.all(requestErrorHandlers.map((handler) => handler(...args)))
}
