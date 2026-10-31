import { DEFAULT_LOCALE, getMessages, isLocale, LOCALE_HEADER } from "@acme/i18n"
import { headers } from "next/headers"
import { getRequestConfig } from "next-intl/server"

/** The public site takes its language from the url: `/fr/...` is rewritten by `proxy.ts` and carries `x-locale`. */
export default getRequestConfig(async () => {
  const requested = (await headers()).get(LOCALE_HEADER)
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE
  return { locale, messages: getMessages(locale) }
})
