"use client"

import { errorMessage } from "@acme/orpc/errors"
import { orpc } from "@acme/orpc/react"
import { Button } from "@acme/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/components/card"
import { Input } from "@acme/ui/components/input"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

function download(name: string, content: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: "application/json" }))
  const link = Object.assign(document.createElement("a"), { href: url, download: name })
  link.click()
  URL.revokeObjectURL(url)
}

export function PrivacyPanel() {
  const [email, setEmail] = useState("")
  const onError = (error: Error) => toast.error(errorMessage(error))
  const exportData = useMutation(
    orpc.privacy.export.mutationOptions({ onError, onSuccess: (result) => download("my-data.json", result) }),
  )
  const remove = useMutation(
    orpc.privacy.deleteAccount.mutationOptions({ onError, onSuccess: () => window.location.assign("/sign-in") }),
  )

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Your data</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button
          variant="outline"
          className="w-fit"
          disabled={exportData.isPending}
          onClick={() => exportData.mutate({})}
        >
          Download my data
        </Button>
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            remove.mutate({ email })
          }}
        >
          <p className="text-muted-foreground text-sm">
            Deleting your account removes your profile and everything you created. Type your email to confirm.
          </p>
          <div className="flex gap-2">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
            <Button type="submit" variant="destructive" disabled={!email || remove.isPending}>
              Delete account
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
