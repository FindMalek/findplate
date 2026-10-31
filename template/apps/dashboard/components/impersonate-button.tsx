"use client"

import { authClient } from "@acme/auth/client"
import { Button } from "@acme/ui/components/button"
import { toast } from "sonner"

export function ImpersonateButton({ userId }: { userId: string }) {
  async function start() {
    const { error } = await authClient.admin.impersonateUser({ userId })
    if (error) return void toast.error(error.message ?? "Could not impersonate this user.")
    window.location.assign("/")
  }
  return (
    <Button size="sm" variant="ghost" onClick={start}>
      Impersonate
    </Button>
  )
}
