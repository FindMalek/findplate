import { expect, test } from "bun:test"
import { createWhatsApp } from "./index"

test("notify sends the text as a template message through kapso", async () => {
  const calls: { url: string; headers: Headers; body: Record<string, unknown> }[] = []
  const whatsapp = createWhatsApp({
    apiKey: "kapso_key",
    phoneNumberId: "1234",
    to: "+15551234567",
    templateName: "app_notification",
    templateLanguage: "en_US",
    fetch: (async (url: string, init: RequestInit) => {
      calls.push({ url, headers: new Headers(init.headers), body: JSON.parse(String(init.body)) })
      return Response.json({ messages: [{ id: "wamid.1" }] })
    }) as unknown as typeof fetch,
  })

  const result = await whatsapp?.notify("New signup")

  expect(result).toEqual({ id: "wamid.1" })
  expect(calls[0]?.url).toContain("api.kapso.ai/meta/whatsapp")
  expect(calls[0]?.url).toContain("/1234/messages")
  expect(calls[0]?.headers.get("x-api-key")).toBe("kapso_key")
  expect(calls[0]?.body).toMatchObject({
    to: "+15551234567",
    type: "template",
    template: {
      name: "app_notification",
      language: { code: "en_US" },
      components: [{ type: "body", parameters: [{ type: "text", text: "New signup", parameter_name: "message" }] }],
    },
  })
})

test("no api key or phone number means no client", () => {
  expect(createWhatsApp({ templateName: "n", templateLanguage: "en_US" })).toBeNull()
})
