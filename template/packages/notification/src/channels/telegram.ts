import { verifySecretHeader } from "@acme/webhooks"

export interface TelegramConfig {
  token?: string
  /** Where messages go by default. Find it with `/start` (see `pnpm --filter @acme/notification telegram:setup`). */
  chatId?: string
  /** Sent back by Telegram in `X-Telegram-Bot-Api-Secret-Token` on every webhook call. */
  webhookSecret?: string
  fetch?: typeof fetch
}

export interface TelegramUpdate {
  update_id: number
  message?: { chat: { id: number }; text?: string }
}

export interface TelegramChannel {
  /** Messages `to`, or the configured chat. `markdown` turns on Telegram's legacy Markdown. */
  send: (text: string, options?: { to?: string; markdown?: boolean }) => Promise<void>
  /** The api route for Telegram's webhook: checks the secret, answers `/start` with the chat id. */
  handleWebhook: (request: Request) => Promise<Response>
  call: <T>(method: string, body?: Record<string, unknown>) => Promise<T>
}

/** Talks to the Bot API directly. Returns null without a bot token. */
export function createTelegramChannel(config: TelegramConfig): TelegramChannel | null {
  if (!config.token) return null
  const { token, chatId, webhookSecret, fetch: doFetch = fetch } = config

  async function call<T>(method: string, body: Record<string, unknown> = {}): Promise<T> {
    const response = await doFetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = (await response.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string }
    if (!json.ok) throw new Error(`Telegram ${method}: ${json.description ?? response.status}`)
    return json.result as T
  }

  return {
    call,
    async send(text, options = {}) {
      const target = options.to ?? chatId
      if (!target) throw new Error("Set TELEGRAM_CHAT_ID to notify (send /start to the bot, then run setup).")
      await call("sendMessage", {
        chat_id: target,
        text,
        ...(options.markdown ? { parse_mode: "Markdown", link_preview_options: { is_disabled: true } } : {}),
      })
    },
    async handleWebhook(request) {
      if (!verifySecretHeader(request, "x-telegram-bot-api-secret-token", webhookSecret)) {
        return Response.json({ message: "Forbidden." }, { status: 403 })
      }
      const update = (await request.json().catch(() => null)) as TelegramUpdate | null
      const message = update?.message
      if (message?.text?.startsWith("/start")) {
        // A 500 makes Telegram retry the same update, so a failed reply is logged and acknowledged.
        await call("sendMessage", {
          chat_id: message.chat.id,
          text: `Your chat id is ${message.chat.id}. Set TELEGRAM_CHAT_ID to it to get notifications here.`,
        }).catch((error) => console.error("[telegram] reply failed", error))
      }
      return Response.json({ ok: true })
    },
  }
}
