import type { Db } from "@acme/db"
import type { z } from "zod"

export interface JobContext {
  db: Db
  now: () => Date
  jobId: string
}

export interface RetryPolicy {
  /** Attempts after the first one fails. */
  limit: number
  /** Seconds before the first retry. */
  delaySeconds: number
  /** Double the delay on every retry. */
  backoff: boolean
}

export interface JobDefinition<S extends z.ZodType> {
  /** Queue name, unique per project. */
  name: string
  description: string
  payload: S
  handler: (payload: z.output<S>, context: JobContext) => Promise<void>
  /** Cron expression, evaluated in UTC. A scheduled job runs with `scheduleData` as its payload. */
  cron?: string
  scheduleData?: z.input<S>
  retry?: RetryPolicy
}

export interface Job<S extends z.ZodType = z.ZodType> {
  name: string
  description: string
  schema: S
  cron?: string
  scheduleData?: z.input<S>
  retry: RetryPolicy
  /** Parses the payload, then runs the handler. A payload that no longer fits the schema throws. */
  run: (raw: unknown, context: JobContext) => Promise<void>
}

const DEFAULT_RETRY: RetryPolicy = { limit: 3, delaySeconds: 30, backoff: true }

/** A job is its queue name, its zod payload and a handler. Add it to `JOBS` in `src/jobs/index.ts`. */
export function defineJob<S extends z.ZodType>(definition: JobDefinition<S>): Job<S> {
  return {
    name: definition.name,
    description: definition.description,
    schema: definition.payload,
    cron: definition.cron,
    scheduleData: definition.scheduleData,
    retry: definition.retry ?? DEFAULT_RETRY,
    run: (raw, context) => definition.handler(definition.payload.parse(raw), context),
  }
}
