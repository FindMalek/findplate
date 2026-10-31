"use client"

import { authClient } from "@acme/auth/client"
import { Button } from "@acme/ui/components/button"

/** Shown on every app page while an admin is signed in as someone else, the session lasts an hour at most. */
export function ImpersonationBanner() {
  const { data } = authClient.useSession()
  if (!data?.session.impersonatedBy) return null
  async function stop() {
    await authClient.admin.stopImpersonating()
    window.location.assign("/users")
  }
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-3 bg-destructive px-4 py-2 text-destructive-foreground text-sm">
      <span>You are signed in as {data.user.email}.</span>
      <Button size="sm" variant="secondary" onClick={stop}>
        Stop impersonating
      </Button>
    </div>
  )
}
