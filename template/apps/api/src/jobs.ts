import type { Db } from "@acme/db"
import type { ApiEnv } from "@acme/env/api"
import { connectBoss, connectTrigger, createJobs, createTriggerJobs, type JobsRunner } from "@acme/jobs"

/** Connects pg-boss to the app database, or trigger.dev when `TRIGGER_SECRET_KEY` is set. With `worker` off this process only enqueues. */
export async function startJobs(env: ApiEnv, db: Db, options: { worker: boolean }): Promise<JobsRunner> {
  // @findplate:trigger
  if (env.TRIGGER_SECRET_KEY) {
    return createTriggerJobs({
      client: connectTrigger({ secretKey: env.TRIGGER_SECRET_KEY, apiUrl: env.TRIGGER_API_URL }),
    })
  }
  // @end
  const boss = connectBoss(env.DATABASE_URL, {
    worker: options.worker,
    onError: (error) => console.error("[jobs]", error),
  })
  const jobs = createJobs({ boss, db, worker: options.worker })
  await jobs.start()
  return jobs
}

/** On SIGTERM or SIGINT: stop taking requests, let running jobs finish (up to 8s), then exit. */
export function shutdownOnSignal(jobs: JobsRunner, server?: { stop(): unknown }) {
  let stopping = false
  const stop = async (signal: string) => {
    if (stopping) return
    stopping = true
    console.info(`${signal} received, finishing running jobs`)
    await server?.stop()
    await jobs.stop()
    process.exit(0)
  }
  process.on("SIGTERM", () => void stop("SIGTERM"))
  process.on("SIGINT", () => void stop("SIGINT"))
}
