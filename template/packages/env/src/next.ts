import { z } from "zod"
import { parseEnv } from "./parse"

const schema = z.object({
  /** Where the Next server reaches the api: http://localhost:3001 locally, the api service inside the cluster. */
  API_URL: z.url().default("http://localhost:3001"),
  WEB_URL: z.url().default("http://localhost:3000"),
  API_PUBLIC_URL: z.url().default("http://localhost:3001"),
  DASHBOARD_URL: z.url().default("http://localhost:3002"),
  NEXT_PUBLIC_UMAMI_URL: z.url().default("https://cloud.umami.is"), // @findplate:umami
  NEXT_PUBLIC_UMAMI_WEBSITE_ID: z.string().optional(), // @findplate:umami
  NEXT_PUBLIC_GLITCHTIP_DSN: z.string().optional(), // @findplate:glitchtip
})

export const nextEnv = () => parseEnv(schema)
