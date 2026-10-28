import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { adminProcedure } from "../procedures"

const jobInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
  cron: z.string().nullable(),
  queued: z.number(),
  active: z.number(),
  failed: z.number(),
})

export const jobsRouter = {
  list: adminProcedure
    .route({
      method: "GET",
      path: "/admin/jobs",
      summary: "Background jobs and their queue sizes (admins only)",
      tags: ["admin"],
    })
    .output(z.array(jobInfoSchema))
    .handler(({ context }) => context.jobs.list()),
  enqueue: adminProcedure
    .route({ method: "POST", path: "/admin/jobs/enqueue", summary: "Queue a job now (admins only)", tags: ["admin"] })
    .input(z.object({ name: z.string(), payload: z.unknown().optional() }))
    .output(z.object({ id: z.string().nullable() }))
    .handler(async ({ input, context }) => {
      const result = await context.jobs.enqueue(input.name, input.payload ?? {})
      if (!result.ok) throw new ORPCError("BAD_REQUEST", { message: result.error })
      return { id: result.id }
    }),
}
