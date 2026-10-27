import { randomBytes } from "node:crypto"
import { appendFileSync } from "node:fs"
import { createTelegram, type TelegramUpdate } from "./index"

const token = process.env.TELEGRAM_BOT_TOKEN
const publicUrl = process.env.API_PUBLIC_URL
const [name, description] = process.argv.slice(2)

if (!token) {
  console.error(`No bot token. In Telegram open @BotFather, send /newbot, then put the token in .env:
  TELEGRAM_BOT_TOKEN=123456:ABC...`)
  process.exit(1)
}

const bot = createTelegram({ token })!
const me = await bot.call<{ username: string }>("getMe")
console.info(`bot: @${me.username}`)

if (name) await bot.call("setMyName", { name })
if (description) await bot.call("setMyDescription", { description })

let chatId = process.env.TELEGRAM_CHAT_ID
if (!chatId) {
  await bot.call("deleteWebhook")
  console.info(
    "Removed the current webhook so updates can be read; it is registered again below if API_PUBLIC_URL is https.",
  )
  console.info(`Send /start to @${me.username} (waiting up to 2 minutes)...`)
  const deadline = Date.now() + 120_000
  let offset: number | undefined
  while (!chatId && Date.now() < deadline) {
    const updates = await bot.call<TelegramUpdate[]>("getUpdates", {
      timeout: 10,
      offset,
      allowed_updates: ["message"],
    })
    for (const update of updates) {
      offset = update.update_id + 1
      if (update.message?.text?.startsWith("/start")) chatId = String(update.message.chat.id)
    }
  }
  if (chatId) console.info(`chat id: ${chatId}`)
  else console.info("No /start seen. Run setup again once you've sent it.")
}

if (!publicUrl?.startsWith("https://")) {
  console.info("API_PUBLIC_URL isn't https, so the webhook is not registered. Telegram needs a public https url.")
} else {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || randomBytes(24).toString("base64url")
  await bot.call("setWebhook", {
    url: `${publicUrl}/telegram/webhook`,
    secret_token: secret,
    allowed_updates: ["message"],
  })
  console.info(`webhook: ${publicUrl}/telegram/webhook`)
  if (!process.env.TELEGRAM_WEBHOOK_SECRET) console.info(`Add to .env: TELEGRAM_WEBHOOK_SECRET=${secret}`)
}

if (chatId && !process.env.TELEGRAM_CHAT_ID) {
  appendFileSync(new URL("../../../.env", import.meta.url), `\nTELEGRAM_CHAT_ID=${chatId}\n`)
  console.info("Wrote TELEGRAM_CHAT_ID to .env")
}
