export const LOCALES = ["en", "fr"] as const
export type Locale = (typeof LOCALES)[number]

/** Served without a prefix: `/` is English, `/fr` is French. */
export const DEFAULT_LOCALE: Locale = "en"

/** Set by the language switcher, read by the proxy and the dashboard. */
export const LOCALE_COOKIE = "NEXT_LOCALE"

/** Set by the web proxy on a rewritten request so the page knows which language the url asked for. */
export const LOCALE_HEADER = "x-locale"

/** What the switcher shows. Each language is written in itself, so it is never translated. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", fr: "Français" }

export const isLocale = (value: string | null | undefined): value is Locale => LOCALES.some((l) => l === value)

/** `/fr/roadmap` becomes `{ locale: "fr", pathname: "/roadmap" }`. A path without a known prefix is the default locale. */
export function splitLocale(pathname: string): { locale: Locale | null; pathname: string } {
  const [, first = "", ...rest] = pathname.split("/")
  if (!isLocale(first)) return { locale: null, pathname }
  return { locale: first, pathname: `/${rest.join("/")}` }
}

/** The url path of `pathname` in `locale`: the default locale has no prefix. */
export function localizedPath(locale: Locale, pathname: string): string {
  const { pathname: bare } = splitLocale(pathname)
  if (locale === DEFAULT_LOCALE) return bare
  return bare === "/" ? `/${locale}` : `/${locale}${bare}`
}

/** `Accept-Language` to the best supported locale: `fr-CA,fr;q=0.9,en;q=0.8` is `fr`. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  const wanted = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag = "", q] = part.trim().split(";q=")
      return { language: tag.split("-")[0]?.toLowerCase(), weight: q ? Number(q) : 1 }
    })
    .sort((a, b) => b.weight - a.weight)
  return wanted.map((entry) => entry.language).find(isLocale) ?? DEFAULT_LOCALE
}

/** Every language of one page for `<link rel="alternate" hreflang>` and the sitemap, plus `x-default`. */
export function alternateUrls(origin: string, pathname: string): Record<string, string> {
  const url = (locale: Locale) => {
    const path = localizedPath(locale, pathname)
    return `${origin}${path === "/" ? "" : path}`
  }
  return { ...Object.fromEntries(LOCALES.map((locale) => [locale, url(locale)])), "x-default": url(DEFAULT_LOCALE) }
}
