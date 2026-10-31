import { configure, runs, tasks } from "@trigger.dev/sdk"
import type { Job, RetryPolicy } from "./define"
import type { EnqueueResult, JobInfo, JobsRunner } from "./index"
import { JOBS } from "./jobs"

/** The slice of the trigger.dev sdk used here, which is also what tests fake. */
export interface TriggerClient {
  trigger(taskId: string, payload: object): Promise<{ id: string }>
  /** Number of runs of a task in the given statuses (capped, enough for a badge). */
  count(taskId: string, statuses: string[]): Promise<number>
}

const QUEUED = ["QUEUED", "PENDING_VERSION", "DELAYED", "WAITING"]
const ACTIVE = ["EXECUTING", "DEQUEUED", "REATTEMPTING"]
const FAILED = ["FAILED", "CRASHED", "SYSTEM_FAILURE", "TIMED_OUT"]

/** trigger.dev retries `maxAttempts` times in total, pg-boss counts the retries after the first attempt. */
export const triggerRetry = (retry: RetryPolicy) => ({
  maxAttempts: retry.limit + 1,
  minTimeoutInMs: Math.max(retry.delaySeconds, 1) * 1000,
  factor: retry.backoff ? 2 : 1,
  randomize: false,
})

/** Cloud by default, your own instance when `apiUrl` is set (docs: Jobs, self-hosting trigger.dev). */
export function connectTrigger(options: { secretKey: string; apiUrl?: string }): TriggerClient {
  configure({ secretKey: options.secretKey, baseURL: options.apiUrl })
  return {
    async trigger(taskId, payload) {
      return tasks.trigger(taskId, payload)
    },
    async count(taskId, statuses) {
      const page = await runs.list({ taskIdentifier: [taskId], status: statuses as never, limit: 100 })
      return page.data.length
    },
  }
}

export interface TriggerJobsOptions {
  client: TriggerClient
  jobs?: readonly Job[]
}

/**
 * The same `Jobs` api as the pg-boss runner, but runs live on trigger.dev: handlers are deployed with
 * `pnpm --filter @acme/jobs trigger:deploy`, so this process only enqueues and never runs a worker.
 */
export function createTriggerJobs(options: TriggerJobsOptions): JobsRunner {
  const { client, jobs = JOBS } = options
  const byName = new Map(jobs.map((job) => [job.name, job]))

  async function enqueue(name: string, payload: unknown): Promise<EnqueueResult> {
    const job = byName.get(name)
    if (!job) return { ok: false, error: `Unknown job "${name}".` }
    const parsed = job.schema.safeParse(payload)
    if (!parsed.success) return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join(", ") }
    const handle = await client.trigger(job.name, parsed.data as object)
    return { ok: true, id: handle.id }
  }

  return {
    enqueue,
    async send(job, payload) {
      const result = await enqueue(job.name, payload)
      if (!result.ok) throw new Error(result.error)
      return result.id
    },
    async list(): Promise<JobInfo[]> {
      return Promise.all(
        jobs.map(async (job) => ({
          name: job.name,
          description: job.description,
          cron: job.cron ?? null,
          queued: await client.count(job.name, QUEUED),
          active: await client.count(job.name, ACTIVE),
          failed: await client.count(job.name, FAILED),
        })),
      )
    },
    async start() {},
    async stop() {},
  }
}
