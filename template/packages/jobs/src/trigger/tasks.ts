import { createDb, type Db } from "@acme/db"
import { schedules, task } from "@trigger.dev/sdk"
import type { Job } from "../define"
import { cleanupSessions } from "../jobs/cleanup-sessions"
import { echo } from "../jobs/echo"
import { triggerRetry } from "../trigger"

let db: Db | undefined
const getDb = () => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set in the trigger.dev environment variables.")
  db ??= createDb(url)
  return db
}

/**
 * One trigger.dev task per job, with the job's name as task id. Trigger finds tasks by their export, so a new job
 * needs its line here as well as in `JOBS`, a test fails when one is missing.
 */
function toTask(job: Job) {
  const retry = triggerRetry(job.retry)
  const context = (runId: string) => ({ db: getDb(), now: () => new Date(), jobId: runId })
  if (job.cron) {
    return schedules.task({
      id: job.name,
      cron: job.cron,
      retry,
      run: async (_payload, { ctx }) => job.run(job.scheduleData ?? {}, context(ctx.run.id)),
    })
  }
  return task({ id: job.name, retry, run: async (payload: unknown, { ctx }) => job.run(payload, context(ctx.run.id)) })
}

export const cleanupSessionsTask = toTask(cleanupSessions)
export const echoTask = toTask(echo)
