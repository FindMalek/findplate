import { TemplateDefinition, WhatsAppClient } from "@kapso/whatsapp-cloud-api"
import { KAPSO_BASE_URL, NOTIFY_PARAM, NOTIFY_TEMPLATE_BODY } from "./index"

const { KAPSO_API_KEY, WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_TEMPLATE_NAME, WHATSAPP_TEMPLATE_LANGUAGE } = process.env

if (!KAPSO_API_KEY || !WHATSAPP_BUSINESS_ACCOUNT_ID) {
  console.error(`Set these in .env first:
  KAPSO_API_KEY               https://app.kapso.ai (project settings, API keys)
  WHATSAPP_BUSINESS_ACCOUNT_ID  the WhatsApp business account id of your connected number`)
  process.exit(1)
}

const client = new WhatsAppClient({ baseUrl: KAPSO_BASE_URL, kapsoApiKey: KAPSO_API_KEY })
const name = WHATSAPP_TEMPLATE_NAME || "app_notification"
const language = WHATSAPP_TEMPLATE_LANGUAGE || "en_US"

const definition = TemplateDefinition.buildTemplateDefinition({
  name,
  language,
  category: "UTILITY",
  parameterFormat: "NAMED",
  components: [
    {
      type: "BODY",
      text: NOTIFY_TEMPLATE_BODY,
      example: { bodyTextNamedParams: [{ paramName: NOTIFY_PARAM, example: "New signup" }] },
    },
  ],
})

await client.templates.create({ businessAccountId: WHATSAPP_BUSINESS_ACCOUNT_ID, ...definition })
console.info(`Submitted template "${name}" (${language}). Meta reviews it, which can take a few minutes.`)
console.info("Once it is approved, notify() can send it to WHATSAPP_NOTIFY_TO.")
