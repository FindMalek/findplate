import type { ReactElement } from "react"
import { LinkTemplate } from "./layout"

interface LinkProps {
  name?: string
  url: string
}

interface Template {
  subject: string
  render: (props: LinkProps) => ReactElement
}

const hi = (name?: string) => (name ? `Hi ${name}, ` : "Hi, ")

/** Add a template here and `mailer.send("<name>", ...)` is typed for it. */
export const templates = {
  verifyEmail: {
    subject: "Verify your email",
    render: ({ name, url }) => (
      <LinkTemplate
        title="Verify your email"
        intro={`${hi(name)}confirm this address to finish setting up your account.`}
        cta="Verify email"
        url={url}
      />
    ),
  },
  resetPassword: {
    subject: "Reset your password",
    render: ({ name, url }) => (
      <LinkTemplate
        title="Reset your password"
        intro={`${hi(name)}use the button below to choose a new password.`}
        cta="Reset password"
        url={url}
      />
    ),
  },
  test: {
    subject: "Test email",
    render: ({ url }) => (
      <LinkTemplate title="Test email" intro="Email is set up and sending from your api." cta="Open app" url={url} />
    ),
  },
  magicLink: {
    subject: "Your sign-in link",
    render: ({ url }) => (
      <LinkTemplate title="Sign in" intro="Use the button below to sign in. The link works once." cta="Sign in" url={url} />
    ),
  },
} satisfies Record<string, Template>

export type TemplateName = keyof typeof templates
