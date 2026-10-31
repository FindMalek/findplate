import type {} from "next-intl"
import type { Locale } from "./config"
import en from "./messages/en.json"
import fr from "./messages/fr.json"

export * from "./config"

/** The shape of `messages/en.json`. Every other language must have the same keys, and `t("...")` is checked against it. */
export type Messages = typeof en

const MESSAGES: Record<Locale, Messages> = { en, fr }

export const getMessages = (locale: Locale): Messages => MESSAGES[locale]

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale
    Messages: Messages
  }
}
