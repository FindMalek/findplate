import { PAID_PLANS } from "@acme/billing/plans"
import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { protectedProcedure } from "../procedures"

const statusSchema = z.object({
  plan: z.string(),
  status: z.string().nullable(),
  renewsAt: z.date().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  configured: z.boolean(),
})
const urlSchema = z.object({ url: z.string() })

/** Where the provider sends the customer back to: the app that made the call. */
function returnUrl(headers: Headers, path: string): string {
  const origin = headers.get("origin")
  if (!origin) throw new ORPCError("BAD_REQUEST", { message: "Missing the Origin header." })
  return new URL(path, origin).toString()
}

export const billingRouter = {
  status: protectedProcedure
    .route({ method: "GET", path: "/billing", summary: "Your plan and subscription", tags: ["billing"] })
    .output(statusSchema)
    .handler(({ context }) => context.billing.status(context.user.id)),

  checkout: protectedProcedure
    .route({
      method: "POST",
      path: "/billing/checkout",
      summary: "Start a checkout for a paid plan",
      tags: ["billing"],
    })
    .input(z.object({ plan: z.enum(PAID_PLANS) }))
    .output(urlSchema)
    .handler(async ({ context, input }) => {
      if (!context.billing.provider) throw new ORPCError("BAD_REQUEST", { message: "Billing is not configured." })
      const url = await context.billing.checkout(context.user, input.plan, {
        success: returnUrl(context.headers, "/billing?checkout=success"),
        cancel: returnUrl(context.headers, "/billing"),
      })
      return { url }
    }),

  portal: protectedProcedure
    .route({ method: "POST", path: "/billing/portal", summary: "Open the customer portal", tags: ["billing"] })
    .output(urlSchema)
    .handler(async ({ context }) => {
      if (!context.billing.provider) throw new ORPCError("BAD_REQUEST", { message: "Billing is not configured." })
      try {
        return { url: await context.billing.portal(context.user.id, returnUrl(context.headers, "/billing")) }
      } catch {
        throw new ORPCError("NOT_FOUND", { message: "You have no subscription to manage yet." })
      }
    }),
}
