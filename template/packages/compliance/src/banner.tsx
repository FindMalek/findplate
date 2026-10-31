"use client"

import { Button } from "@acme/ui/components/button"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { CONSENT_COOKIE, type Consent, consentCookie } from "./consent"

/**
 * Asks once before analytics run. The choice is the `consent` cookie, which the analytics components read on the
 * server, so a refresh after the click is what starts (or keeps off) the scripts.
 */
export function ConsentBanner() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    setOpen(!document.cookie.split("; ").some((part) => part.startsWith(`${CONSENT_COOKIE}=`)))
  }, [])
  if (!open) return null

  const choose = (value: Consent) => {
    // biome-ignore lint/suspicious/noDocumentCookie: a plain cookie the server reads, the Cookie Store API is not everywhere yet
    document.cookie = consentCookie(value)
    setOpen(false)
    router.refresh()
  }
  return (
    <div className="fixed right-4 bottom-16 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-wrap items-center justify-between gap-3 border bg-card p-4 text-sm shadow-lg">
      <p className="text-muted-foreground">We use analytics cookies to see what works. Only if you agree.</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => choose("denied")}>
          Decline
        </Button>
        <Button size="sm" onClick={() => choose("granted")}>
          Accept
        </Button>
      </div>
    </div>
  )
}
