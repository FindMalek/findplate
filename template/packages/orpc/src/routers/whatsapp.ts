import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { adminProcedure } from "../procedures"

export const whatsappRouter = {
  test: adminProcedure
    .route({
      method: "POST",
      path: "/whatsapp/test",
      summary: "Send a test WhatsApp message (admins only)",
      tags: ["whatsapp"],
    })
    .input(z.object({ text: z.string().min(1).max(500).default("Hello from your api.") }))
    .output(z.object({ id: z.string().optional() }))
    .handler(async ({ context, input }) => {
      if (!context.whatsapp) {
        throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Set KAPSO_API_KEY and WHATSAPP_PHONE_NUMBER_ID first." })
      }
      try {
        return await context.whatsapp.notify(input.text)
      } catch (error) {
        throw new ORPCError("BAD_GATEWAY", { message: error instanceof Error ? error.message : "WhatsApp failed." })
      }
    }),
}
