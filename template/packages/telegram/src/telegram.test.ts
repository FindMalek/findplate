import { expect, test } from "bun:test"
import { createTelegram } from "./index"

function setup() {
  const calls: { url: string; body: Record<string, unknown> }[] = []
  const bot = createTelegram({
    token: "123:abc",
    chatId: "42",
    webhookSecret: "s3cret",
    fetch: (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) })
      return Response.json({ ok: true, result: true })
    }) as unknown as typeof fetch,
  })!
  return { bot, calls }
}

const webhook = (secret: string | null, text: string) =>
  new Request("https://api.test/telegram/webhook", {
    method: "POST",
    headers: secret ? { "x-telegram-bot-api-secret-token": secret } : {},
    body: JSON.stringify({ update_id: 1, message: { chat: { id: 7 }, text } }),
  })

test("notify sends to the configured chat", async () => {
  const { bot, calls } = setup()
  await bot.notify("deployed")
  expect(calls[0]?.url).toBe("https://api.telegram.org/bot123:abc/sendMessage")
  expect(calls[0]?.body).toEqual({ chat_id: "42", text: "deployed" })
})

test("webhook rejects a wrong secret and answers /start with the chat id", async () => {
  const { bot, calls } = setup()
  expect((await bot.handleWebhook(webhook("nope", "/start"))).status).toBe(403)
  expect(calls).toHaveLength(0)

  expect((await bot.handleWebhook(webhook("s3cret", "/start"))).status).toBe(200)
  expect(calls[0]?.body).toMatchObject({ chat_id: 7 })
  expect(String(calls[0]?.body.text)).toContain("7")
})
