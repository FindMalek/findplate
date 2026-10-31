"use client"

import { orgClient } from "@acme/auth/orgs"
import { Button } from "@acme/ui/components/button"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

export default function AcceptInvitationPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  async function accept() {
    const { error } = await orgClient.organization.acceptInvitation({ invitationId: id })
    if (error) return void toast.error(error.message ?? "This invitation is no longer valid.")
    router.push("/team")
  }
  return (
    <div className="grid place-items-center gap-4 p-10 text-center">
      <p>You were invited to join an organization.</p>
      <Button onClick={accept}>Accept invitation</Button>
    </div>
  )
}
