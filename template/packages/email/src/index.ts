import { createEmailClient } from "@opencoredev/email-sdk"
import { renderEmail } from "@opencoredev/email-sdk/react"
import { resend } from "@opencoredev/email-sdk/resend"
import { type TemplateName, templates } from "./templates"

export { type TemplateName, templates } from "./templates"

export interface MailerConfig {
  apiKey?: string
  /** `Name <address@your-domain>`; the domain must be verified in Resend (`pnpm --filter @acme/email domain`). */
  from: string
  fetch?: typeof fetch
}

export interface Mailer {
  send: (template: TemplateName, to: string, props: { url: string; name?: string }) => Promise<{ id?: string }>
}

/** Renders a template to html and text and sends it through Resend, or returns null when there's no api key. */
export function createMailer(config: MailerConfig): Mailer | null {
  if (!config.apiKey) return null
  const client = createEmailClient({ adapters: [resend({ apiKey: config.apiKey, fetch: config.fetch })] })
  return {
    async send(template, to, props) {
      const { subject, render } = templates[template]
      const { html, text } = await renderEmail(render(props))
      const result = await client.send({ from: config.from, to, subject, html, text })
      return { id: result.id }
    },
  }
}
