import { getTranslations } from "next-intl/server"

/** The landing hero's words in the page language. See `messages/en.json` in `@acme/i18n`. */
export async function heroCopy() {
  const t = await getTranslations("hero")
  return { badge: t("badge"), start: t("getStarted"), docs: t("apiDocs") }
}
