import { resolveModel } from "@acme/ai" // @findplate:ai
import { createAuth } from "@acme/auth"
import { createDb } from "@acme/db"
import { runMigrations } from "@acme/db/migrate"
import { seedDemo } from "@acme/db/seed"
import { loadApiEnv } from "@acme/env/api"
import { createStorage } from "@acme/storage" // @findplate:storage
import { createWhatsApp } from "@acme/whatsapp" // @findplate:whatsapp
import { ensureAdmin } from "./admin"
import { createServer } from "./server"

const env = loadApiEnv()
const db = createDb(env.DATABASE_URL)
await runMigrations(db)

const auth = createAuth({
  db,
  secret: env.BETTER_AUTH_SECRET,
  dashboardUrl: env.DASHBOARD_URL,
  trustedOrigins: [env.WEB_URL, env.DASHBOARD_URL],
  github:
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET }
      : undefined,
  secureCookies: env.NODE_ENV === "production",
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
    },
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
    // @findplate:whatsapp
    whatsapp: createWhatsApp({
      apiKey: env.KAPSO_API_KEY,
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
      to: env.WHATSAPP_NOTIFY_TO,
      templateName: env.WHATSAPP_TEMPLATE_NAME,
      templateLanguage: env.WHATSAPP_TEMPLATE_LANGUAGE,
    }),
    // @end
    // @findplate:ai
    model: resolveModel(env.AI_MODEL, env),
    // @end
  },
  { publicUrl: env.API_PUBLIC_URL },
)

const server = Bun.serve({ port: env.PORT, hostname: "0.0.0.0", fetch })
console.info(`api on :${server.port} (${env.DEPLOY_ENV})`)
