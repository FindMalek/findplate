"use client"

import { orgClient } from "@acme/auth/orgs"
import { Badge } from "@acme/ui/components/badge"
import { Button } from "@acme/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/components/card"
import { Input } from "@acme/ui/components/input"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

const slugOf = (name: string) =>
  `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${Math.random().toString(36).slice(2, 6)}`

export function TeamBoard() {
  const router = useRouter()
  const { data: organizations } = orgClient.useListOrganizations()
  const { data: active } = orgClient.useActiveOrganization()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  /** Runs a better-auth call, shows its error, refreshes the server data on success. */
  async function run(call: Promise<{ error: { message?: string } | null }>, done?: () => void) {
    const { error } = await call
    if (error) return void toast.error(error.message ?? "Something went wrong.")
    done?.()
    router.refresh()
  }

  return (
    <div className="grid max-w-2xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Your organizations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={active ? "outline" : "default"}
              onClick={() => run(orgClient.organization.setActive({ organizationId: null }))}
            >
              Personal
            </Button>
            {organizations?.map((organization) => (
              <Button
                key={organization.id}
                size="sm"
                variant={active?.id === organization.id ? "default" : "outline"}
                onClick={() => run(orgClient.organization.setActive({ organizationId: organization.id }))}
              >
                {organization.name}
              </Button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (name.trim()) {
                void run(orgClient.organization.create({ name: name.trim(), slug: slugOf(name) }), () => setName(""))
              }
            }}
          >
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="New organization" />
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      {active && (
        <Card>
          <CardHeader>
            <CardTitle>{active.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ul className="grid gap-2">
              {active.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {member.user.name} <span className="text-muted-foreground">{member.user.email}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">{member.role}</Badge>
                    {member.role !== "owner" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => run(orgClient.organization.removeMember({ memberIdOrEmail: member.id }))}
                      >
                        Remove
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {active.invitations
              .filter((invitation) => invitation.status === "pending")
              .map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Invited {invitation.email}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => run(orgClient.organization.cancelInvitation({ invitationId: invitation.id }))}
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (email.trim()) {
                  void run(orgClient.organization.inviteMember({ email: email.trim(), role: "member" }), () => {
                    setEmail("")
                    toast.success("Invitation sent.")
                  })
                }
              }}
            >
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@company.com"
              />
              <Button type="submit">Invite</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
