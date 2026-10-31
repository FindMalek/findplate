import { FLAG_NAMES } from "@acme/flags"
import { z } from "zod"
import { adminProcedure, publicProcedure } from "../procedures"

const flagStateSchema = z.object({
  name: z.enum(FLAG_NAMES),
  description: z.string(),
  default: z.boolean(),
  source: z.enum(["env", "db", "default"]),
  stored: z.number().nullable(),
  envRule: z.number().nullable(),
  enabled: z.boolean(),
})

const nameInput = z.object({ name: z.enum(FLAG_NAMES) })

export const flagsRouter = {
  all: publicProcedure
    .route({ method: "GET", path: "/flags", summary: "Every flag as it applies to the caller", tags: ["flags"] })
    .output(z.record(z.string(), z.boolean()))
    .handler(({ context }) => context.flags.all(context.session?.user.id)),
  list: adminProcedure
    .route({
      method: "GET",
      path: "/admin/flags",
      summary: "Flags with their overrides (admins only)",
      tags: ["admin"],
    })
    .output(z.array(flagStateSchema))
    .handler(({ context }) => context.flags.list(context.session?.user.id)),
  set: adminProcedure
    .route({
      method: "POST",
      path: "/admin/flags/set",
      summary: "Roll a flag out to 0-100% (admins only)",
      tags: ["admin"],
    })
    .input(nameInput.extend({ rollout: z.number().int().min(0).max(100) }))
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ input, context }) => {
      await context.flags.set(input.name, input.rollout)
      return { ok: true as const }
    }),
  reset: adminProcedure
    .route({
      method: "POST",
      path: "/admin/flags/reset",
      summary: "Drop a flag's override (admins only)",
      tags: ["admin"],
    })
    .input(nameInput)
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ input, context }) => {
      await context.flags.reset(input.name)
      return { ok: true as const }
    }),
}
