import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { adminProcedure } from "../procedures"

export const emailRouter = {
  test: adminProcedure
    .route({ method: "POST", path: "/email/test", summary: "Send a test email (admins only)", tags: ["email"] })
    .input(z.object({ to: z.email() }))
    .output(z.object({ id: z.string().optional() }))
    .handler(async ({ context, input }) => {
      if (!context.mailer) throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Set RESEND_API_KEY to send email." })
      return context.mailer.send("magicLink", input.to, { url: "https://example.com" })
    }),
}
