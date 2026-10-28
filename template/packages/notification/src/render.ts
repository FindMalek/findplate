import { render } from "@react-email/render"
import { createElement } from "react"
import { getTemplate, type TemplateData, type TemplateName } from "./templates"
import type { Summary } from "./templates/define"

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export function summarize<Name extends TemplateName>(name: Name, data: TemplateData<Name>): Summary {
  return getTemplate(name).summary(data)
}

/** Html and a plain-text twin, rendered from the same react tree. */
export async function renderEmail<Name extends TemplateName>(
  name: Name,
  data: TemplateData<Name>,
  appUrl?: string,
): Promise<RenderedEmail> {
  const template = getTemplate(name)
  const element = createElement(template.Email, { ...data, appUrl } as Record<string, unknown>)
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
  return { subject: template.subject(data), html, text }
}

const MARKDOWN_SPECIALS = /([_*`[])/g

/** Telegram's legacy Markdown: bold title, plain lines, one link. */
export function toTelegram({ title, lines, link }: Summary): string {
  const esc = (text: string) => text.replace(MARKDOWN_SPECIALS, "\\$1")
  return [`*${esc(title)}*`, ...lines.map(esc), link ? `[${esc(link.label)}](${link.url})` : ""]
    .filter(Boolean)
    .join("\n")
}

const WHATSAPP_MAX = 900

/** WhatsApp template variables can't hold line breaks, so this is one short line. */
export function toWhatsApp({ title, lines, link }: Summary): string {
  const text = [`${title}.`, ...lines, link?.url].filter(Boolean).join(" ").replace(/\s+/g, " ").trim()
  return text.length > WHATSAPP_MAX ? `${text.slice(0, WHATSAPP_MAX - 1)}…` : text
}
