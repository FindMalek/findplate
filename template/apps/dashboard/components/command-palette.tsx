"use client"

import { authClient } from "@acme/auth/client"
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES } from "@acme/i18n" // @findplate:i18n
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@acme/ui/components/command"
import { Kbd } from "@acme/ui/components/kbd"
import { SidebarMenuButton, SidebarMenuItem } from "@acme/ui/components/sidebar"
import { LanguagesIcon, LogOutIcon, MonitorIcon, MoonIcon, SearchIcon, SunIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { visibleNav } from "@/lib/nav"

export function CommandPalette({ role }: { role: string | null }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { setTheme } = useTheme()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      setOpen((value) => !value)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const run = (action: () => void | Promise<void>) => () => {
    setOpen(false)
    void action()
  }

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Search" onClick={() => setOpen(true)}>
          <SearchIcon />
          <span>Search</span>
          <Kbd className="ml-auto">⌘K</Kbd>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Go to">
            {visibleNav(role).map((item) => (
              <CommandItem key={item.href} value={`go ${item.label}`} onSelect={run(() => router.push(item.href))}>
                <item.icon />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Theme">
            <CommandItem value="theme light" onSelect={run(() => setTheme("light"))}>
              <SunIcon />
              Light
            </CommandItem>
            <CommandItem value="theme dark" onSelect={run(() => setTheme("dark"))}>
              <MoonIcon />
              Dark
            </CommandItem>
            <CommandItem value="theme system" onSelect={run(() => setTheme("system"))}>
              <MonitorIcon />
              System
            </CommandItem>
          </CommandGroup>
          {/* @findplate:i18n */}
          <CommandGroup heading="Language">
            {LOCALES.map((locale) => (
              <CommandItem
                key={locale}
                value={`language ${LOCALE_NAMES[locale]}`}
                onSelect={run(() => {
                  // biome-ignore lint/suspicious/noDocumentCookie: cookieStore is missing in some browsers
                  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
                  window.location.reload()
                })}
              >
                <LanguagesIcon />
                {LOCALE_NAMES[locale]}
              </CommandItem>
            ))}
          </CommandGroup>
          {/* @end */}
          <CommandGroup heading="Account">
            <CommandItem
              value="sign out"
              onSelect={run(async () => {
                await authClient.signOut()
                window.location.assign("/sign-in")
              })}
            >
              <LogOutIcon />
              Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
