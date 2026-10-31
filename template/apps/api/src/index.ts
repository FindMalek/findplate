import { resolveModel } from "@acme/ai" // @findplate:ai
import { createAuth } from "@acme/auth"
import { createBilling } from "@acme/billing" // @findplate:billing
import { createCache } from "@acme/cache" // @findplate:cache
import { createDb } from "@acme/db"
import { runMigrations } from "@acme/db/migrate"
import { seedDemo } from "@acme/db/seed"
import { loadApiEnv } from "@acme/env/api"
import { createFlags } from "@acme/flags/server" // @findplate:flags
import { authEmails, createNotifier } from "@acme/notification" // @findplate:notification
import { createRateLimiter } from "@acme/orpc" // @findplate:rate-limit
import { createStorage } from "@acme/storage" // @findplate:storage
import * as Sentry from "@sentry/bun" // @findplate:glitchtip
import { ensureAdmin } from "./admin"
import { shutdownOnSignal, startJobs } from "./jobs" // @findplate:jobs
import { startLangfuse } from "./langfuse" // @findplate:langfuse
import { startLogger } from "./logger" // @findplate:logger
import { startOpenObserve } from "./openobserve" // @findplate:openobserve
import { createServer } from "./server"

const env = loadApiEnv()
startLogger(env) // @findplate:logger
Sentry.init({ dsn: env.GLITCHTIP_DSN, environment: env.DEPLOY_ENV }) // @findplate:glitchtip
startOpenObserve(env) // @findplate:openobserve
startLangfuse(env) // @findplate:langfuse
const db = createDb(env.DATABASE_URL)
await runMigrations(db)
const jobs = await startJobs(env, db, { worker: env.JOBS_WORKER }) // @findplate:jobs

// @findplate:notification
const notification = createNotifier(env, { appUrl: env.DASHBOARD_URL })
// @end

const trustedOrigins = [env.WEB_URL, env.DASHBOARD_URL]
trustedOrigins.push("acme://", "exp://") // @findplate:mobile

const auth = createAuth({
  db,
  secret: env.BETTER_AUTH_SECRET,
  dashboardUrl: env.DASHBOARD_URL,
  trustedOrigins,
  github:
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET }
      : undefined,
  secureCookies: env.NODE_ENV === "production",
  ...authEmails(notification), // @findplate:notification
})

const adminId = await ensureAdmin(db, auth, env.ADMIN_EMAIL, env.ADMIN_PASSWORD)
if (env.SEED === "demo" && (await seedDemo(db, { ownerId: adminId }))) console.info("seeded demo data")

const fetch = createServer(
  {
    db,
    auth,
    now: () => new Date(),
    config: {
      deployEnv: env.DEPLOY_ENV,
      githubAuth: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
      githubRepo: env.GITHUB_REPO,
      githubToken: env.GITHUB_TOKEN,
      webUrl: env.WEB_URL, // @findplate:status
      dashboardUrl: env.DASHBOARD_URL, // @findplate:status
    },
    billing: createBilling(env, db), // @findplate:billing
    flags: createFlags({ db, override: env.FLAGS_OVERRIDE }), // @findplate:flags
    jobs, // @findplate:jobs
    // @findplate:rate-limit
    rateLimiter: createRateLimiter({
      upstashUrl: env.UPSTASH_REDIS_REST_URL,
      upstashToken: env.UPSTASH_REDIS_REST_TOKEN,
    }),
    // @end
    // @findplate:cache
    cache: createCache({ upstashUrl: env.UPSTASH_REDIS_REST_URL, upstashToken: env.UPSTASH_REDIS_REST_TOKEN }),
    // @end
    // @findplate:storage
    storage: createStorage({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      prefix: env.DEPLOY_ENV.startsWith("pr-") ? `${env.DEPLOY_ENV}/` : "",
    }),
    // @end
    notification, // @findplate:notification
    // @findplate:ai
    model: resolveModel(env.AI_MODEL, env),
    // @end
  },
  { publicUrl: env.API_PUBLIC_URL },
)

const server = Bun.serve({ port: env.PORT, hostname: "0.0.0.0", fetch })
shutdownOnSignal(jobs, server) // @findplate:jobs
console.info(`api on :${server.port} (${env.DEPLOY_ENV})`)
