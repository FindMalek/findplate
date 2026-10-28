import { createDb } from "@acme/db"
import { loadApiEnv } from "@acme/env/api"
import { shutdownOnSignal, startJobs } from "./jobs"
import { startLogger } from "./logger" // @findplate:logger

/** The worker on its own: `bun apps/api/src/worker.ts`, or the `worker` target of the api Dockerfile. No http server. */
const env = loadApiEnv()
startLogger(env) // @findplate:logger
const db = createDb(env.DATABASE_URL)
const jobs = await startJobs(env, db, { worker: true })
shutdownOnSignal(jobs)
console.info(`worker running (${env.DEPLOY_ENV})`)
