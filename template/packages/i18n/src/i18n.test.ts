import { expect, test } from "bun:test"
import { NextRequest } from "next/server"
import { alternateUrls, localizedPath, negotiateLocale, splitLocale } from "./config"
import { localeProxy } from "./proxy"

test("a locale prefix is split off and put back, the default locale has none", () => {
  expect(splitLocale("/fr/roadmap")).toEqual({ locale: "fr", pathname: "/roadmap" })
  expect(splitLocale("/frog")).toEqual({ locale: null, pathname: "/frog" })
  expect(localizedPath("fr", "/")).toBe("/fr")
  expect(localizedPath("fr", "/en/roadmap")).toBe("/fr/roadmap")
  expect(localizedPath("en", "/fr/roadmap")).toBe("/roadmap")
})

test("accept-language picks the best supported language", () => {
  expect(negotiateLocale("de,fr-CA;q=0.9,en;q=0.5")).toBe("fr")
  expect(negotiateLocale("de")).toBe("en")
})

test("hreflang alternates point at one url per language", () => {
  expect(alternateUrls("https://acme.dev", "/roadmap")).toEqual({
    en: "https://acme.dev/roadmap",
    fr: "https://acme.dev/fr/roadmap",
    "x-default": "https://acme.dev/roadmap",
  })
})

test("the proxy serves /fr from the same page and sends a returning french visitor there", () => {
  const prefixed = localeProxy(new NextRequest("http://localhost:3000/fr/roadmap"))
  expect(prefixed.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/roadmap")
  expect(prefixed.headers.get("x-middleware-request-x-locale")).toBe("fr")

  const returning = localeProxy(
    new NextRequest("http://localhost:3000/roadmap?x=1", { headers: { cookie: "NEXT_LOCALE=fr" } }),
  )
  expect(returning.headers.get("location")).toBe("http://localhost:3000/fr/roadmap?x=1")

  const english = localeProxy(new NextRequest("http://localhost:3000/en/roadmap"))
  expect(english.headers.get("location")).toBe("http://localhost:3000/roadmap")
})
