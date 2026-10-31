import type { Notifier } from "./index"

interface AuthUser {
  email: string
  name: string
}

export interface AuthEmails {
  sendVerification: (user: AuthUser, url: string) => Promise<unknown>
  sendResetPassword: (user: AuthUser, url: string) => Promise<unknown>
  sendMagicLink: (email: string, url: string) => Promise<unknown>
  sendInvitation: (invite: { email: string; inviter: string; role: string; url: string }) => Promise<unknown>
}

/** Hooks for `createAuth`: verification, password reset and magic link mail. Empty when email isn't configured. */
export function authEmails(notifier: Notifier): Partial<AuthEmails> {
  if (!notifier.channels.includes("email")) return {}
  return {
    sendVerification: (user, url) =>
      notifier.send({ channel: "email", to: user.email, template: "verifyEmail", data: { name: user.name, url } }),
    sendResetPassword: (user, url) =>
      notifier.send({ channel: "email", to: user.email, template: "resetPassword", data: { name: user.name, url } }),
    sendMagicLink: (email, url) => notifier.send({ channel: "email", to: email, template: "magicLink", data: { url } }),
    sendInvitation: ({ email, inviter, role, url }) =>
      notifier.send({ channel: "email", to: email, template: "adminInvite", data: { inviter, role, url } }),
  }
}
