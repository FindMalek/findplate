import { type LogLevel, logger, patchConsole } from "./index"

/** Node runtime only (see `instrumentation.ts`): server logs from pages and actions become structured lines. */
export function registerLogger(options: { level: LogLevel }) {
  logger.configure({ level: options.level, pretty: process.env.NODE_ENV !== "production" })
  patchConsole(logger)
}

interface RequestInfo {
  path: string
  method: string
}

interface ErrorContext {
  routePath: string
  routeType: string
}

/** Next's `onRequestError`: a failed render or route handler, with the route it happened in. */
export function logRequestError(error: unknown, request: Readonly<RequestInfo>, context: Readonly<ErrorContext>) {
  logger.error("request failed", {
    err: error,
    method: request.method,
    path: request.path,
    route: context.routePath,
    routeType: context.routeType,
  })
}
