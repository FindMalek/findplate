import { createEmailChannel } from "./channels/email"
import { createTelegramChannel } from "./channels/telegram"
import { createWhatsAppChannel } from "./channels/whatsapp"
import { renderEmail, summarize, toTelegram, toWhatsApp } from "./render"
import type { TemplateData, TemplateName } from "./templates"

export { type AuthEmails, authEmails } from "./auth"
export { type TemplateData, type TemplateName, templates } from "./templates"

export const CHANNELS = ["email", "telegram", "whatsapp"] as const
export type Channel = (typeof CHANNELS)[number]

/** The slice of the api env the notifier reads. Every key is optional: a channel is on when its keys are set. */
export interface NotificationEnv {
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
  TELEGRAM_BOT_TOKEN?: string
  TELEGRAM_CHAT_ID?: string
  TELEGRAM_WEBHOOK_SECRET?: string
  KAPSO_API_KEY?: string
  WHATSAPP_PHONE_NUMBER_ID?: string
  WHATSAPP_NOTIFY_TO?: string
  WHATSAPP_TEMPLATE_NAME?: string
  WHATSAPP_TEMPLATE_LANGUAGE?: string
}

export interface NotifierOptions {
  /** Public url of the app, shown in the email footer. */
  appUrl?: string
  fetch?: typeof fetch
}

export interface SendInput<Name extends TemplateName = TemplateName> {
  channel: Channel
  /** Email address, Telegram chat id or phone number. Telegram and WhatsApp fall back to the configured one. */
  to?: string
  template: Name
  data: TemplateData<Name>
}

export interface SendResult {
  channel: Channel
  /** False when the channel isn't configured. */
  sent: boolean
  id?: string
  error?: string
}

export interface Notifier {
  /** The channels that have their keys set. */
  channels: Channel[]
  /** Renders a template for the channel and sends it. An unconfigured channel is skipped, a provider failure throws. */
  send: <Name extends TemplateName>(input: SendInput<Name>) => Promise<SendResult>
  /** Plain text to every configured channel (or the ones asked for). One channel failing doesn't stop the rest. */
  notify: (text: string, options?: { channels?: Channel[] }) => Promise<SendResult[]>
  /** The api route for Telegram's webhook; answers 404 when Telegram isn't configured. */
  handleTelegramWebhook: (request: Request) => Promise<Response>
}

/** One entry point for email, Telegram and WhatsApp. Channels without keys are simply off. */
export function createNotifier(env: NotificationEnv, options: NotifierOptions = {}): Notifier {
  const email = createEmailChannel({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM ?? "onboarding@resend.dev",
    fetch: options.fetch,
  })
  const telegram = createTelegramChannel({
    token: env.TELEGRAM_BOT_TOKEN,
    chatId: env.TELEGRAM_CHAT_ID,
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
    fetch: options.fetch,
  })
  const whatsapp = createWhatsAppChannel({
    apiKey: env.KAPSO_API_KEY,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    to: env.WHATSAPP_NOTIFY_TO,
    templateName: env.WHATSAPP_TEMPLATE_NAME ?? "app_notification",
    templateLanguage: env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en_US",
    fetch: options.fetch,
  })
  const channels = CHANNELS.filter((channel) => ({ email, telegram, whatsapp })[channel])

  const on = (channel: Channel) => channels.includes(channel)

  async function sendChat(channel: "telegram" | "whatsapp", to: string | undefined, text: string, markdown = false) {
    if (channel === "telegram") {
      await telegram?.send(text, { to, markdown })
      return {}
    }
    return (await whatsapp?.send(text, { to })) ?? {}
  }

  return {
    channels,
    async send({ channel, to, template, data }) {
      if (!on(channel)) return { channel, sent: false }
      if (channel === "email") {
        if (!to) throw new Error("Email needs a `to` address.")
        const result = await email?.send(to, await renderEmail(template, data, options.appUrl))
        return { channel, sent: true, id: result?.id }
      }
      const summary = summarize(template, data)
      const text = channel === "telegram" ? toTelegram(summary) : toWhatsApp(summary)
      const result = await sendChat(channel, to, text, channel === "telegram")
      return { channel, sent: true, id: result.id }
    },
    async notify(text, notifyOptions = {}) {
      const targets = notifyOptions.channels ?? channels
      return Promise.all(
        targets.map(async (channel): Promise<SendResult> => {
          if (channel === "email" || !on(channel)) return { channel, sent: false }
          try {
            const result = await sendChat(channel, undefined, text)
            return { channel, sent: true, id: result.id }
          } catch (error) {
            return { channel, sent: false, error: error instanceof Error ? error.message : "Send failed." }
          }
        }),
      )
    },
    handleTelegramWebhook: (request) =>
      telegram?.handleWebhook(request) ??
      Promise.resolve(Response.json({ message: "Telegram is not configured." }, { status: 404 })),
  }
}
