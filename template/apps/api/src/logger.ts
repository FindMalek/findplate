import type { ApiEnv } from "@acme/env/api"
import { type Fields, logger, patchConsole, resolveRequestId, withRequestId } from "@acme/logger"
import { trace } from "@opentelemetry/api" // @findplate:openobserve
import * as Sentry from "@sentry/bun" // @findplate:glitchtip
import type { Handler } from "./server"

/** Trace ids from whichever tracer is running, so a log line can be found from its trace and back. */
function traceFields(): Fields {
  // @findplate:openobserve
  const otel = trace.getActiveSpan()?.spanContext()
  if (otel) return { trace_id: otel.traceId, span_id: otel.spanId }
  // @end
  // @findplate:glitchtip
  const sentry = Sentry.getActiveSpan()?.spanContext()
  if (sentry) return { trace_id: sentry.traceId, span_id: sentry.spanId }
  // @end
  return {}
}

/** Json in production, one readable line in dev. Existing `console.*` calls are routed through the same logger. */
export function startLogger(env: ApiEnv) {
  logger.configure({ level: env.LOG_LEVEL, pretty: env.NODE_ENV !== "production", mixin: traceFields })
  patchConsole(logger)
}

/** Gives every request an id (the inbound `x-request-id` or a new one), logs it when done and returns it as a header. */
export function withRequestLogging(next: Handler): Handler {
  return async (request) => {
    const requestId = resolveRequestId(request.headers.get("x-request-id"))
    const { pathname } = new URL(request.url)
    const started = performance.now()
    return withRequestId(requestId, async () => {
      let response: Response
      try {
        response = await next(request)
      } catch (error) {
        logger.error("request failed", { method: request.method, path: pathname, err: error })
        throw error
      }
      const log = pathname === "/health" ? logger.debug : logger.info
      log("request", {
        method: request.method,
        path: pathname,
        status: response.status,
        ms: Math.round(performance.now() - started),
      })
      const withId = new Response(response.body, response)
      withId.headers.set("x-request-id", requestId)
      return withId
    })
  }
}
