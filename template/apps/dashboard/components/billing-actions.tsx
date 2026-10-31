"use client"

import { errorMessage } from "@acme/orpc/errors"
import { orpc } from "@acme/orpc/react"
import { Button } from "@acme/ui/components/button"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

const go = (result: { url: string }) => window.location.assign(result.url)
const onError = (error: Error) => toast.error(errorMessage(error))

export function BillingActions({ plan, configured }: { plan: string; configured: boolean }) {
  const checkout = useMutation(orpc.billing.checkout.mutationOptions({ onSuccess: go, onError }))
  const portal = useMutation(orpc.billing.portal.mutationOptions({ onSuccess: go, onError }))
  if (!configured)
    return <p className="text-muted-foreground text-sm">Billing is off: add the Stripe or Polar keys to the api.</p>
  return plan === "free" ? (
    <Button disabled={checkout.isPending} onClick={() => checkout.mutate({ plan: "pro" })}>
      Upgrade to Pro
    </Button>
  ) : (
    <Button variant="outline" disabled={portal.isPending} onClick={() => portal.mutate({})}>
      Manage subscription
    </Button>
  )
}
