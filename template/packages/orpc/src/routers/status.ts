import { sql } from "drizzle-orm"
import { z } from "zod"
import { publicProcedure } from "../procedures"

async function probe(url: string): Promise<{ ok: boolean; ms: number | null }> {
  const started = performance.now()
  const ok = await fetch(url, { signal: AbortSignal.timeout(3000), redirect: "manual" })
    .then((res) => res.status < 500)
    .catch(() => false)
  return { ok, ms: ok ? Math.round(performance.now() - started) : null }
}

export const statusRouter = {
  services: publicProcedure
    .route({ method: "GET", path: "/public/services", summary: "Uptime check of every service", tags: ["public"] })
    .output(z.array(z.object({ name: z.string(), ok: z.boolean(), ms: z.number().nullable() })))
    .handler(async ({ context }) => {
      const started = performance.now()
      const dbOk = await context.db
        .execute(sql`select 1`)
        .then(() => true)
        .catch(() => false)
      const [web, dashboard] = await Promise.all([probe(context.config.webUrl), probe(context.config.dashboardUrl)])
      return [
        { name: "api", ok: true, ms: null },
        { name: "database", ok: dbOk, ms: dbOk ? Math.round(performance.now() - started) : null },
        { name: "web", ...web },
        { name: "dashboard", ...dashboard },
      ]
    }),
}
