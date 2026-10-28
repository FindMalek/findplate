import { CHANNELS } from "@acme/notification"
import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { adminProcedure } from "../procedures"

export const notificationRouter = {
  test: adminProcedure
    .route({
      method: "POST",
      path: "/admin/notification/test",
      summary: "Send a test notification on one channel (admins only)",
      tags: ["notification"],
    })
    .input(
      z.object({
        channel: z.enum(CHANNELS),
        /** Email address, Telegram chat id or phone number; Telegram and WhatsApp default to the configured one. */
        to: z.string().min(1).max(254).optional(),
      }),
    )
    .output(z.object({ channel: z.enum(CHANNELS), sent: z.boolean(), id: z.string().optional() }))
    .handler(async ({ context, input }) => {
      if (!context.notification.channels.includes(input.channel)) {
        throw new ORPCError("SERVICE_UNAVAILABLE", { message: `The ${input.channel} channel has no keys in .env.` })
      }
      if (input.channel === "email" && !input.to) {
        throw new ORPCError("BAD_REQUEST", { message: "Email needs a `to` address." })
      }
      try {
        const url = context.headers.get("origin") ?? "http://localhost:3002"
        return await context.notification.send({
          channel: input.channel,
          to: input.to,
          template: "test",
          data: { url },
        })
      } catch (error) {
        throw new ORPCError("BAD_GATEWAY", { message: error instanceof Error ? error.message : "Sending failed." })
      }
    }),
}
