import { json, request } from "./http"
import { secret } from "./secrets"
import type { Ctx, Task } from "./task"

export interface Browser {
  id: "db" | "s3"
  name: string
  service: string
  port: number
  compose: string
  env: string
}

/** Read-only pgweb. Without a url it shows its connect form, so the same instance serves every preview database. */
export const PGWEB_COMPOSE = `services:
  pgweb:
    image: sosedoff/pgweb:latest
    command: ["pgweb", "--bind=0.0.0.0", "--listen=8081", "--readonly"]
    environment:
      PGWEB_DATABASE_URL: \${PGWEB_DATABASE_URL:-}
    restart: unless-stopped
`

export const S3_BROWSER_COMPOSE = `services:
  s3-browser:
    image: cloudlena/s3manager:latest
    environment:
      ENDPOINT: \${S3_HOST}
      USE_SSL: \${S3_USE_SSL}
      ACCESS_KEY_ID: \${S3_ACCESS_KEY_ID}
      SECRET_ACCESS_KEY: \${S3_SECRET_ACCESS_KEY}
      REGION: \${S3_REGION:-us-east-1}
    restart: unless-stopped
`

export function s3Target(endpoint: string): { host: string; useSsl: boolean } {
  const url = new URL(endpoint)
  return { host: url.host, useSsl: url.protocol === "https:" }
}

export const previewBase = (domain?: string) => process.env.PREVIEW_DOMAIN ?? (domain ? `preview.${domain}` : "")

export function browserHosts(base: string) {
  return { db: `db.${base}`, s3: `s3.${base}` }
}

export const toEnvText = (vars: Record<string, string>) =>
  Object.entries(vars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")

/** The only place that knows Dokploy's compose and security endpoints. compose.create/update/deploy are documented, the rest is assumed from the dashboard. */
export function composeApi(baseUrl: string, apiKey: string) {
  const root = `${baseUrl.replace(/\/$/, "")}/api`
  const auth = { "x-api-key": apiKey }
  const post = (path: string, body: unknown) => request<Record<string, string>>(`${root}/${path}`, json(auth, body))
  const find = async (name: string, environmentId: string) => {
    const projects = await request<
      { environments?: { environmentId: string; compose?: { composeId: string; name: string }[] }[] }[]
    >(`${root}/project.all`, json(auth))
    return projects
      .flatMap((project) => project.environments ?? [])
      .find((env) => env.environmentId === environmentId)
      ?.compose?.find((compose) => compose.name === name)?.composeId
  }
  return {
    async ensure(
      browser: Browser,
      environmentId: string,
      host: string,
      basicAuth: { username: string; password: string },
    ) {
      let composeId = await find(browser.name, environmentId)
      const isNew = !composeId
      if (!composeId) {
        const created = await post("compose.create", {
          name: browser.name,
          appName: browser.name,
          environmentId,
          composeType: "docker-compose",
          sourceType: "raw",
        })
        composeId = created.composeId ?? (await find(browser.name, environmentId))
        if (!composeId) throw new Error(`compose.create returned no composeId for ${browser.name}`)
      }
      await post("compose.update", { composeId, composeFile: browser.compose, env: browser.env })
      if (isNew) {
        await post("domain.create", {
          host,
          port: browser.port,
          https: true,
          certificateType: "letsencrypt",
          composeId,
          serviceName: browser.service,
          domainType: "compose",
        })
        await post("security.create", { composeId, ...basicAuth })
      }
      await post("compose.deploy", { composeId, title: "findplate browser" })
    },
  }
}

export function planBrowsers(ctx: Ctx): Task[] {
  const url = ctx.config.dokployUrl
  const endpoint = ctx.config.s3Endpoint
  if (!url) throw new Error("Set your Dokploy url first: findplate config set dokployUrl https://dokploy.example.com")
  if (!endpoint) throw new Error("Set your S3 endpoint first: findplate config set s3Endpoint https://s3.example.com")
  const base = previewBase(ctx.domain)
  if (!base) throw new Error("Pass --domain example.com or set PREVIEW_DOMAIN")
  const hosts = browserHosts(base)
  const target = s3Target(endpoint)

  const browsers = (): Browser[] => [
    {
      id: "db",
      name: `${ctx.name}-db-browser`,
      service: "pgweb",
      port: 8081,
      compose: PGWEB_COMPOSE,
      env: toEnvText({ PGWEB_DATABASE_URL: process.env.BROWSER_DATABASE_URL ?? "" }),
    },
    {
      id: "s3",
      name: `${ctx.name}-s3-browser`,
      service: "s3-browser",
      port: 8080,
      compose: S3_BROWSER_COMPOSE,
      env: "",
    },
  ]

  return browsers().map((preview) => ({
    id: `browsers:${preview.id}`,
    title: `${preview.id === "db" ? "pgweb (read-only)" : "S3 browser"} at https://${hosts[preview.id]} behind basic auth, Dokploy compose ${preview.name}`,
    async run() {
      const environmentId = process.env.DOKPLOY_ENVIRONMENT_ID
      if (!environmentId) throw new Error("Set DOKPLOY_ENVIRONMENT_ID to the preview environment id")
      const browser = { ...preview }
      if (preview.id === "s3") {
        browser.env = toEnvText({
          S3_HOST: target.host,
          S3_USE_SSL: String(target.useSsl),
          S3_ACCESS_KEY_ID: await secret("S3_ACCESS_KEY_ID", "S3 access key id"),
          S3_SECRET_ACCESS_KEY: await secret("S3_SECRET_ACCESS_KEY", "S3 secret access key"),
          S3_REGION: process.env.S3_REGION ?? "us-east-1",
        })
      }
      const api = composeApi(url, await secret("DOKPLOY_API_KEY", "Dokploy API key"))
      await api.ensure(browser, environmentId, hosts[preview.id], {
        username: process.env.BROWSER_USER ?? "preview",
        password: await secret("BROWSER_PASSWORD", "Basic auth password for the browsers"),
      })
    },
  }))
}
