import { type NextRequest, NextResponse } from "next/server"
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALE_HEADER, localizedPath, splitLocale } from "./config"

/**
 * Locale prefixes for the public site without moving a single page. `/fr/roadmap` is served by the page at
 * `/roadmap` with `x-locale: fr`, `/en/roadmap` redirects to `/roadmap`, and a visitor who picked French before is
 * sent from `/roadmap` to `/fr/roadmap`. Crawlers have no cookie, so every url has exactly one language.
 */
export function localeProxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl
  const { locale, pathname: bare } = splitLocale(pathname)

  if (locale && locale !== DEFAULT_LOCALE) {
    const headers = new Headers(request.headers)
    headers.set(LOCALE_HEADER, locale)
    const response = NextResponse.rewrite(new URL(`${bare}${search}`, request.url), { request: { headers } })
    response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" })
    return response
  }
  if (locale === DEFAULT_LOCALE) return NextResponse.redirect(new URL(`${bare}${search}`, request.url))

  const preferred = request.cookies.get(LOCALE_COOKIE)?.value
  if (isLocale(preferred) && preferred !== DEFAULT_LOCALE) {
    return NextResponse.redirect(new URL(`${localizedPath(preferred, pathname)}${search}`, request.url))
  }
  return NextResponse.next()
}
