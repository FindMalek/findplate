import type { Db } from "@acme/db"
import { PgBoss } from "pg-boss"
import type { z } from "zod"
import type { Job, RetryPolicy } from "./define"
import { JOBS } from "./jobs"

export { defineJob, type Job, type JobContext, type JobDefinition, type RetryPolicy } from "./define"
export { JOBS } from "./jobs"

export interface JobInfo {
  name: string
  description: string
  cron: string | null
  queued: number
  active: number
  failed: number
}

export type EnqueueResult = { ok: true; id: string | null } | { ok: false; error: string }

/** What procedures see: enqueue and look, never run. */
export interface Jobs {
  /** Enqueue by name with an untrusted payload (the admin procedure). Says why when the name or payload don't fit. */
  enqueue(name: string, payload: unknown): Promise<EnqueueResult>
  list(): Promise<JobInfo[]>
}

export interface JobsRunner extends Jobs {
  /** Typed enqueue from code: the payload is checked against the job's zod schema at compile time and at runtime. */
  send<S extends z.ZodType>(job: Job<S>, payload: z.input<S>): Promise<string | null>
  start(): Promise<void>
  /** Waits for running jobs to finish, up to `timeoutMs`, then lets pg-boss fail the rest so they retry elsewhere. */
  stop(timeoutMs?: number): Promise<void>
}

interface RetryOptions {
  retryLimit: number
  retryDelay: number
  retryBackoff: boolean
}

/** The slice of pg-boss used here, which is also what tests fake. */
export interface Boss {
  start(): Promise<unknown>
  stop(options: { graceful: boolean; timeout: number }): Promise<void>
  createQueue(name: string): Promise<void>
  work(name: string, handler: (jobs: { id: string; data: object }[]) => Promise<void>): Promise<string>
  schedule(name: string, cron: string, data: object, options: RetryOptions): Promise<void>
  send(name: string, data: object, options: RetryOptions): Promise<string | null>
  getQueues(names: string[]): Promise<{ name: string; queuedCount: number; activeCount: number; failedCount: number }[]>
}

const retryOptions = (retry: RetryPolicy): RetryOptions => ({
  retryLimit: retry.limit,
  retryDelay: retry.delaySeconds,
  retryBackoff: retry.backoff,
})

export interface JobsOptions {
  boss: Boss
  db: Db
  now?: () => Date
  jobs?: readonly Job[]
  /** Run the worker and the cron scheduler in this process. Off means this process only enqueues. */
  worker?: boolean
}

export function createJobs(options: JobsOptions): JobsRunner {
  const { boss, db, now = () => new Date(), jobs = JOBS, worker = true } = options
  const byName = new Map(jobs.map((job) => [job.name, job]))

  async function enqueue(name: string, payload: unknown): Promise<EnqueueResult> {
    const job = byName.get(name)
    if (!job) return { ok: false, error: `Unknown job "${name}".` }
    const parsed = job.schema.safeParse(payload)
    if (!parsed.success) return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join(", ") }
    return { ok: true, id: await boss.send(job.name, parsed.data as object, retryOptions(job.retry)) }
  }

  return {
    enqueue,
    async send(job, payload) {
      const result = await enqueue(job.name, payload)
      if (!result.ok) throw new Error(result.error)
      return result.id
    },
    async list() {
      const queues = await boss.getQueues(jobs.map((job) => job.name))
      return jobs.map((job) => {
        const queue = queues.find((candidate) => candidate.name === job.name)
        return {
          name: job.name,
          description: job.description,
          cron: job.cron ?? null,
          queued: queue?.queuedCount ?? 0,
          active: queue?.activeCount ?? 0,
          failed: queue?.failedCount ?? 0,
        }
      })
    },
    async start() {
      await boss.start()
      for (const job of jobs) await boss.createQueue(job.name)
      if (!worker) return
      for (const job of jobs) {
        await boss.work(job.name, async (batch) => {
          for (const { id, data } of batch) await job.run(data, { db, now, jobId: id })
        })
        if (job.cron) await boss.schedule(job.name, job.cron, job.scheduleData ?? {}, retryOptions(job.retry))
      }
    },
    stop: (timeoutMs = 8_000) => boss.stop({ graceful: true, timeout: timeoutMs }),
  }
}

/** pg-boss keeps its own `pgboss` schema in the same database and creates or migrates it on start. */
export function connectBoss(databaseUrl: string, options: { worker: boolean; onError: (error: Error) => void }): Boss {
  const boss = new PgBoss({
    connectionString: databaseUrl,
    max: 4,
    schedule: options.worker,
    supervise: options.worker,
  })
  boss.on("error", options.onError)
  return boss
}
