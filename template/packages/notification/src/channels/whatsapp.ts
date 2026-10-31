import { buildTemplateSendPayload, WhatsAppClient } from "@kapso/whatsapp-cloud-api"

export const KAPSO_BASE_URL = "https://api.kapso.ai/meta/whatsapp"

/** Body of the template `whatsapp:setup` submits to Meta: one named variable that carries the message. */
export const NOTIFY_TEMPLATE_BODY = "Notification from your app: {{message}}. Reply STOP to opt out."
export const NOTIFY_PARAM = "message"

export interface WhatsAppConfig {
  apiKey?: string
  phoneNumberId?: string
  /** Who messages go to by default, in international format (+15551234567). */
  to?: string
  /** An approved template with one `{{message}}` variable; business-initiated messages must use a template. */
  templateName: string
  templateLanguage: string
  fetch?: typeof fetch
}

export interface WhatsAppChannel {
  send: (text: string, options?: { to?: string }) => Promise<{ id?: string }>
}

/** Sends a template message through Kapso. Returns null without an api key and phone number id. */
export function createWhatsAppChannel(config: WhatsAppConfig): WhatsAppChannel | null {
  const { apiKey, phoneNumberId } = config
  if (!apiKey || !phoneNumberId) return null
  const client = new WhatsAppClient({ baseUrl: KAPSO_BASE_URL, kapsoApiKey: apiKey, fetch: config.fetch })
  return {
    async send(text, options = {}) {
      const to = options.to ?? config.to
      if (!to) throw new Error("Set WHATSAPP_NOTIFY_TO to a number like +15551234567.")
      const response = await client.messages.sendTemplate({
        phoneNumberId,
        to,
        template: buildTemplateSendPayload({
          name: config.templateName,
          language: config.templateLanguage,
          body: [{ type: "text", text: text.replace(/\s+/g, " ").trim(), parameterName: NOTIFY_PARAM }],
        }),
      })
      return { id: response.messages?.[0]?.id }
    },
  }
}
