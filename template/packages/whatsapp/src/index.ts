import { buildTemplateSendPayload, WhatsAppClient } from "@kapso/whatsapp-cloud-api"

export const KAPSO_BASE_URL = "https://api.kapso.ai/meta/whatsapp"

/** Body of the template `whatsapp:setup` submits to Meta: one named variable that carries the notification text. */
export const NOTIFY_TEMPLATE_BODY = "Notification from your app: {{message}}. Reply STOP to opt out."
export const NOTIFY_PARAM = "message"

export interface WhatsAppConfig {
  apiKey?: string
  phoneNumberId?: string
  /** Who `notify` messages, in international format (+15551234567). */
  to?: string
  /** An approved template with one `{{message}}` variable; business-initiated messages must use a template. */
  templateName: string
  templateLanguage: string
  fetch?: typeof fetch
}

export interface WhatsApp {
  notify: (text: string) => Promise<{ id?: string }>
}

/** Sends a template message through Kapso. Returns null without an api key and phone number id. */
export function createWhatsApp(config: WhatsAppConfig): WhatsApp | null {
  const { apiKey, phoneNumberId } = config
  if (!apiKey || !phoneNumberId) return null
  const client = new WhatsAppClient({ baseUrl: KAPSO_BASE_URL, kapsoApiKey: apiKey, fetch: config.fetch })
  return {
    async notify(text) {
      if (!config.to) throw new Error("Set WHATSAPP_NOTIFY_TO to a number like +15551234567.")
      const response = await client.messages.sendTemplate({
        phoneNumberId,
        to: config.to,
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
