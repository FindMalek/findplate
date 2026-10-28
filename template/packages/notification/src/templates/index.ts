import type { FunctionComponent } from "react"
import { adminInvite } from "./admin-invite"
import { alert } from "./alert"
import type { Summary } from "./define"
import { magicLink } from "./magic-link"
import { resetPassword } from "./reset-password"
import { test } from "./test-message"
import { verifyEmail } from "./verify-email"
import { waitlistConfirmation } from "./waitlist-confirmation"
import { welcome } from "./welcome"

export type { Summary, Template } from "./define"
export type { BaseProps } from "./primitives"

/** Add a template here and `notifier.send({ template })` is typed for it and the preview app can show it. */
export const templates = {
  verifyEmail,
  resetPassword,
  magicLink,
  welcome,
  waitlistConfirmation,
  adminInvite,
  alert,
  test,
}

export type Templates = typeof templates
export type TemplateName = keyof Templates
export type TemplateData<Name extends TemplateName> = Parameters<Templates[Name]["subject"]>[0]

interface AnyTemplate {
  subject: (data: object) => string
  Email: FunctionComponent<Record<string, unknown>>
  summary: (data: object) => Summary
  preview: object
}

/** One loose view of the registry, for code that picks a template by a name it only knows at runtime. */
export const getTemplate = (name: TemplateName) => templates[name] as unknown as AnyTemplate
