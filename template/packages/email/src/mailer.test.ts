import { expect, test } from "bun:test"
import { createMailer } from "./index"

test("renders a template and posts it to resend", async () => {
  const sent: { url: string; body: Record<string, unknown> }[] = []
  const mailer = createMailer({
    apiKey: "re_test",
    from: "Acme <hello@example.com>",
    fetch: (async (url: string, init: RequestInit) => {
      sent.push({ url, body: JSON.parse(String(init.body)) })
      return Response.json({ id: "msg_1" })
    }) as unknown as typeof fetch,
  })

  const result = await mailer?.send("verifyEmail", "ada@example.com", { name: "Ada", url: "https://app.test/verify?t=1" })

  expect(result).toEqual({ id: "msg_1" })
  expect(sent[0]?.url).toContain("resend.com")
  expect(sent[0]?.body).toMatchObject({ from: "Acme <hello@example.com>", subject: "Verify your email" })
  expect(String(sent[0]?.body.html)).toContain("https://app.test/verify?t=1")
})

test("no api key means no mailer", () => {
  expect(createMailer({ from: "a@b.co" })).toBeNull()
})
