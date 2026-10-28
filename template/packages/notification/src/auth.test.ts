import { expect, test } from "bun:test"
import { authEmails } from "./auth"
import { createNotifier } from "./index"

test("auth hooks send the verification, reset and magic link mail through resend", async () => {
  const bodies: Record<string, unknown>[] = []
  const doFetch = (async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)))
    return Response.json({ id: "msg_1" })
  }) as unknown as typeof fetch
  const hooks = authEmails(createNotifier({ RESEND_API_KEY: "re_test" }, { fetch: doFetch }))
  const ada = { email: "ada@example.com", name: "Ada" }

  await hooks.sendVerification?.(ada, "https://app.test/verify")
  await hooks.sendResetPassword?.(ada, "https://app.test/reset")
  await hooks.sendMagicLink?.(ada.email, "https://app.test/magic")

  expect(bodies.map((body) => body.subject)).toEqual(["Verify your email", "Reset your password", "Your sign-in link"])
  expect(String(bodies[2]?.html)).toContain("https://app.test/magic")
  expect(authEmails(createNotifier({}))).toEqual({})
})
