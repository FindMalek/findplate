import { json, request } from "./http"
import { secret } from "./secrets"
import type { Ctx, Task } from "./task"

export interface DesiredProject {
  name: string
  description: string
  env: string
}

export function desiredProjects({ name, envs, domain }: Pick<Ctx, "name" | "envs" | "domain">): DesiredProject[] {
  return envs.map((env) => ({
    name: `${name}-${env}`,
    description: `${name} ${env}`,
    env:
      env === "production" && domain
        ? [
            `WEB_URL=https://${domain}`,
            `API_PUBLIC_URL=https://api.${domain}`,
            `DASHBOARD_URL=https://dashboard.${domain}`,
          ].join("\n")
        : "",
  }))
}

export const missingProjects = (desired: DesiredProject[], existing: string[]) =>
  desired.filter((project) => !existing.includes(project.name))

/** The only place that knows Dokploy's api shapes. `x-api-key`, `project.all` and `project.create` are documented, the project.all response shape is assumed. */
export function dokployApi(baseUrl: string, apiKey: string) {
  const root = `${baseUrl.replace(/\/$/, "")}/api`
  const auth = { "x-api-key": apiKey }
  return {
    async projectNames(): Promise<string[]> {
      const projects = await request<{ name: string }[]>(`${root}/project.all`, json(auth))
      return projects.map((project) => project.name)
    },
    async createProject({ name, description, env }: DesiredProject) {
      await request(`${root}/project.create`, json(auth, { name, description, env }))
    },
  }
}

export function planDokploy(ctx: Ctx): Task[] {
  const url = ctx.config.dokployUrl
  if (!url) throw new Error("Set your Dokploy url first: findplate config set dokployUrl https://dokploy.example.com")
  return desiredProjects(ctx).map((project) => ({
    id: `dokploy:project:${project.name}`,
    title: `Dokploy project ${project.name} on ${url}`,
    async run() {
      const api = dokployApi(url, await secret("DOKPLOY_API_KEY", "Dokploy API key"))
      if (missingProjects([project], await api.projectNames()).length) await api.createProject(project)
    },
  }))
}
