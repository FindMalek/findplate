import { createEmailClient } from "@opencoredev/email-sdk"
import { resend } from "@opencoredev/email-sdk/resend"
import type { RenderedEmail } from "../render"

export interface EmailConfig {
  apiKey?: string
  /** `Name <address@your-domain>`; the domain must be verified in Resend (`pnpm --filter @acme/notification domain`). */
  from: string
  fetch?: typeof fetch
}

export interface EmailChannel {
  send: (to: string, email: RenderedEmail) => Promise<{ id?: string }>
}

/** Resend through email-sdk. Returns null without an api key. */
export function createEmailChannel(config: EmailConfig): EmailChannel | null {
  if (!config.apiKey) return null
  const client = createEmailClient({ adapters: [resend({ apiKey: config.apiKey, fetch: config.fetch })] })
  return {
    async send(to, { subject, html, text }) {
      const result = await client.send({ from: config.from, to, subject, html, text })
      return { id: result.id }
    },
  }
}
