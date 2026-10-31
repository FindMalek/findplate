import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { createFeedbackIssue } from "../lib/feedback"
import { enforceRateLimit, RATE_LIMITS } from "../lib/rate-limit" // @findplate:rate-limit
import { publicProcedure } from "../procedures"

export const feedbackRouter = {
  send: publicProcedure
    .route({
      method: "POST",
      path: "/public/feedback",
      summary: "Send feedback, opens a GitHub issue",
      tags: ["public"],
    })
    .input(
      z.object({
        message: z.string().trim().min(5).max(2000),
        email: z.email().max(254).optional().or(z.literal("")),
        page: z.string().max(300).optional(),
        /** A honeypot: people never see this field, bots fill it. */
        website: z.string().max(200).optional(),
      }),
    )
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ context, input }) => {
      await enforceRateLimit(context, "feedback.send", RATE_LIMITS.feedback) // @findplate:rate-limit
      if (input.website) return { ok: true as const }
      const { githubRepo, githubToken } = context.config
      if (!githubRepo || !githubToken) {
        throw new ORPCError("SERVICE_UNAVAILABLE", {
          message: "Feedback needs GITHUB_REPO and GITHUB_TOKEN on the api.",
        })
      }
      try {
        await createFeedbackIssue(
          { repo: githubRepo, token: githubToken },
          { message: input.message, email: input.email, page: input.page },
        )
      } catch (error) {
        console.error("[feedback]", error)
        throw new ORPCError("BAD_GATEWAY", { message: "Could not send your feedback, try again later." })
      }
      return { ok: true as const }
    }),
}
