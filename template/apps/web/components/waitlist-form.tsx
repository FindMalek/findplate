"use client"

import { orpc } from "@acme/orpc/react"
import { Button } from "@acme/ui/components/button"
import { Input } from "@acme/ui/components/input"
import { useMutation } from "@tanstack/react-query"
import { type FormEvent, useState } from "react"

export function WaitlistForm() {
  const [email, setEmail] = useState("")
  const join = useMutation(orpc.waitlist.join.mutationOptions())
  const submit = (event: FormEvent) => {
    event.preventDefault()
    join.mutate({ email })
  }
  if (join.isSuccess) return <p className="text-muted-foreground text-sm">You're on the list. We'll be in touch.</p>
  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-2">
      <div className="flex gap-2">
        <Input
          type="email"
          required
          placeholder="you@example.com"
          aria-label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" disabled={join.isPending}>
          Join the waitlist
        </Button>
      </div>
      {join.isError && <p className="text-destructive text-xs">That didn't work, check the email and try again.</p>}
    </form>
  )
}
