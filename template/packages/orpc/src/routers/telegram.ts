import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { adminProcedure } from "../procedures"

export const telegramRouter = {
  test: adminProcedure
    .route({
      method: "POST",
      path: "/telegram/test",
      summary: "Send a test Telegram message (admins only)",
      tags: ["telegram"],
    })
    .input(z.object({ text: z.string().min(1).max(500).default("Hello from your api.") }))
    .output(z.object({ ok: z.literal(true) }))
    .handler(async ({ context, input }) => {
      if (!context.telegram) throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Set TELEGRAM_BOT_TOKEN first." })
      try {
        await context.telegram.notify(input.text)
      } catch (error) {
        throw new ORPCError("BAD_GATEWAY", { message: error instanceof Error ? error.message : "Telegram failed." })
      }
      return { ok: true as const }
    }),
}
