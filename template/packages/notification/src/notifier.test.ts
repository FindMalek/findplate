import { expect, test } from "bun:test"
import { createNotifier } from "./index"

function recorder() {
  const calls: { url: string; body: Record<string, unknown> }[] = []
  const doFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) })
    return Response.json({ ok: true, result: {}, id: "msg_1", messages: [{ id: "wamid_1" }] })
  }) as unknown as typeof fetch
  return { calls, doFetch }
}

test("only channels with keys are on, and the others are skipped", async () => {
  const { calls, doFetch } = recorder()
  const notifier = createNotifier({ TELEGRAM_BOT_TOKEN: "123:abc", TELEGRAM_CHAT_ID: "42" }, { fetch: doFetch })

  expect(notifier.channels).toEqual(["telegram"])
  expect(
    await notifier.send({ channel: "email", to: "ada@example.com", template: "test", data: { url: "x" } }),
  ).toEqual({
    channel: "email",
    sent: false,
  })
  const results = await notifier.notify("deploy done")

  expect(results).toEqual([{ channel: "telegram", sent: true, id: undefined }])
  expect(calls).toHaveLength(1)
  expect(calls[0]?.url).toContain("api.telegram.org/bot123:abc/sendMessage")
  expect(calls[0]?.body).toEqual({ chat_id: "42", text: "deploy done" })
})

test("send renders the template for each channel it goes to", async () => {
  const { calls, doFetch } = recorder()
  const notifier = createNotifier(
    {
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "Acme <hello@example.com>",
      TELEGRAM_BOT_TOKEN: "123:abc",
      TELEGRAM_CHAT_ID: "42",
    },
    { fetch: doFetch, appUrl: "https://app.test" },
  )
  expect(notifier.channels).toEqual(["email", "telegram"])

  const data = { name: "Ada", url: "https://app.test/verify?t=1" }
  const email = await notifier.send({ channel: "email", to: "ada@example.com", template: "verifyEmail", data })
  await notifier.send({ channel: "telegram", template: "verifyEmail", data })

  expect(email).toEqual({ channel: "email", sent: true, id: "msg_1" })
  expect(calls[0]?.url).toContain("resend.com")
  expect(calls[0]?.body).toMatchObject({ from: "Acme <hello@example.com>", subject: "Verify your email" })
  expect(String(calls[0]?.body.html)).toContain("https://app.test/verify?t=1")
  expect(calls[1]?.body).toMatchObject({ chat_id: "42", parse_mode: "Markdown" })
  expect(String(calls[1]?.body.text)).toContain("*Verify your email*")
})

test("whatsapp sends the template as one line through kapso", async () => {
  const { calls, doFetch } = recorder()
  const notifier = createNotifier(
    { KAPSO_API_KEY: "k", WHATSAPP_PHONE_NUMBER_ID: "555", WHATSAPP_NOTIFY_TO: "+15551234567" },
    { fetch: doFetch },
  )

  const result = await notifier.send({ channel: "whatsapp", template: "test", data: { url: "https://app.test" } })

  expect(result).toEqual({ channel: "whatsapp", sent: true, id: "wamid_1" })
  expect(JSON.stringify(calls[0]?.body)).toContain("Test message.")
})

test("telegram links keep a closing paren and whatsapp titles dont get a double stop", async () => {
  const { toTelegram, toWhatsApp } = await import("./render")
  const summary = { title: "Done!", lines: [], link: { label: "Open", url: "https://a.test/x_(1)" } }

  expect(toTelegram(summary)).toContain("(https://a.test/x_(1%29)")
  expect(toWhatsApp(summary)).toStartWith("Done! https://")
})

test("the telegram webhook rejects calls without the secret and answers 404 when off", async () => {
  const on = createNotifier({ TELEGRAM_BOT_TOKEN: "123:abc", TELEGRAM_WEBHOOK_SECRET: "s3cret" })
  const off = createNotifier({})
  const request = (secret?: string) =>
    new Request("http://api/telegram/webhook", {
      method: "POST",
      headers: secret ? { "x-telegram-bot-api-secret-token": secret } : {},
      body: JSON.stringify({ update_id: 1 }),
    })

  expect((await on.handleTelegramWebhook(request())).status).toBe(403)
  expect((await on.handleTelegramWebhook(request("s3cret"))).status).toBe(200)
  expect((await off.handleTelegramWebhook(request("s3cret"))).status).toBe(404)
})
