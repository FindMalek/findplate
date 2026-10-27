import { request } from "./http"
import { ghSet, secret } from "./secrets"
import type { Ctx, Task } from "./task"

/** Self-hosted cache when `turboCache` is set, otherwise the Vercel one (token from `turbo login`/the dashboard). */
export function planTurbo(ctx: Ctx): Task[] {
  const api = ctx.config.turboCache
  const team = process.env.TURBO_TEAM ?? ctx.name
  return [
    {
      id: "turbo:cache",
      title: `Turborepo remote cache (${api ?? "Vercel"}), team ${team}, saved as GitHub ${ctx.repo} TURBO_TEAM, TURBO_API, TURBO_TOKEN`,
      async run() {
        const token = await secret("TURBO_TOKEN", "Turborepo remote cache token")
        if (api) {
          await request(`${api.replace(/\/$/, "")}/v8/artifacts/status`, {
            headers: { authorization: `Bearer ${token}` },
          })
          ghSet("variable", ctx.repo, "TURBO_API", api)
        }
        ghSet("variable", ctx.repo, "TURBO_TEAM", team)
        ghSet("secret", ctx.repo, "TURBO_TOKEN", token)
      },
    },
  ]
}
