import { getMessages, isLocale, LOCALE_COOKIE, negotiateLocale } from "@acme/i18n"
import { cookies, headers } from "next/headers"
import { getRequestConfig } from "next-intl/server"

/** The dashboard is private, so its language is a preference: the switcher's cookie, else the browser's. */
export default getRequestConfig(async () => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = isLocale(saved) ? saved : negotiateLocale((await headers()).get("accept-language"))
  return { locale, messages: getMessages(locale) }
})
