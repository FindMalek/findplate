"use client"

import { Button } from "@acme/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@acme/ui/components/dropdown-menu"
import { LanguagesIcon } from "lucide-react"
import { isLocale, LOCALE_COOKIE, LOCALE_NAMES, LOCALES, type Locale, localizedPath, splitLocale } from "./config"

/**
 * `path`: the language is in the url (the public site), so go to the same page under the other prefix.
 * `cookie`: the language is a preference (the dashboard), so remember it and reload.
 */
export function LocaleSwitcherMenu({
  locale,
  mode,
  label,
}: {
  locale: Locale
  mode: "path" | "cookie"
  label: string
}) {
  const change = (value: string) => {
    if (!isLocale(value) || value === locale) return
    // biome-ignore lint/suspicious/noDocumentCookie: cookieStore is missing in some browsers
    document.cookie = `${LOCALE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`
    if (mode === "cookie") return window.location.reload()
    const { pathname } = splitLocale(window.location.pathname)
    window.location.assign(`${localizedPath(value, pathname)}${window.location.search}`)
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" aria-label={label} />}>
        <LanguagesIcon data-icon="inline-start" />
        {LOCALE_NAMES[locale]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={locale} onValueChange={change}>
          {LOCALES.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {LOCALE_NAMES[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
