import { z } from "zod"
import { parseEnv } from "./parse"

const optional = z.string().optional()

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  /** "production", "pr-<n>" for previews, or "local". */
  DEPLOY_ENV: z.string().default("local"),
  DATABASE_URL: z.string().min(1),
  SEED: z.enum(["none", "demo"]).default("demo"),

  /** Public origins: the api's own, and the two apps that proxy to it. */
  API_PUBLIC_URL: z.url().default("http://localhost:3001"),
  WEB_URL: z.url().default("http://localhost:3000"),
  DASHBOARD_URL: z.url().default("http://localhost:3002"),

  BETTER_AUTH_SECRET: z.string().min(32),
  GITHUB_CLIENT_ID: optional,
  GITHUB_CLIENT_SECRET: optional,
  /** First admin, created (or its password reset) on every start. */
  ADMIN_EMAIL: optional,
  ADMIN_PASSWORD: optional,

  /** Public repo shown on the landing page (owner/name). */
  GITHUB_REPO: optional,
  GITHUB_TOKEN: optional,

  // @findplate:storage
  S3_ENDPOINT: optional,
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: optional,
  S3_ACCESS_KEY_ID: optional,
  S3_SECRET_ACCESS_KEY: optional,
  // @end

  // @findplate:openobserve
  OPENOBSERVE_URL: z.url().optional(),
  OPENOBSERVE_ORG: z.string().default("default"),
  OPENOBSERVE_USER: optional,
  OPENOBSERVE_PASSWORD: optional,
  // @end

  // @findplate:glitchtip
  GLITCHTIP_DSN: optional,
  // @end

  // @findplate:langfuse
  LANGFUSE_PUBLIC_KEY: optional,
  LANGFUSE_SECRET_KEY: optional,
  LANGFUSE_BASE_URL: z.url().default("https://cloud.langfuse.com"),
  // @findplate:whatsapp
  KAPSO_API_KEY: optional,
  WHATSAPP_PHONE_NUMBER_ID: optional,
  WHATSAPP_NOTIFY_TO: optional,
  WHATSAPP_TEMPLATE_NAME: z.string().default("app_notification"),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default("en_US"),
  // @end
  // @findplate:telegram
  TELEGRAM_BOT_TOKEN: optional,
  TELEGRAM_CHAT_ID: optional,
  TELEGRAM_WEBHOOK_SECRET: optional,
  // @end
  // @findplate:email
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().default("Acme <onboarding@resend.dev>"),
  // @end

  // @findplate:ai
  AI_MODEL: z.string().default("groq:openai/gpt-oss-120b"),
  GROQ_API_KEY: optional,
  OPENAI_API_KEY: optional,
  ANTHROPIC_API_KEY: optional,
  // @end
})

export type ApiEnv = z.infer<typeof schema>
export const loadApiEnv = (source?: Record<string, string | undefined>) => parseEnv(schema, source)
