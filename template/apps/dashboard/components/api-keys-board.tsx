"use client"

import { errorMessage } from "@acme/orpc/errors"
import { orpc } from "@acme/orpc/react"
import { Badge } from "@acme/ui/components/badge"
import { Button } from "@acme/ui/components/button"
import { Card, CardContent } from "@acme/ui/components/card"
import { Input } from "@acme/ui/components/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@acme/ui/components/table"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { LocalDate } from "@/components/local-date"

interface Row {
  id: string
  name: string
  prefix: string
  scope: "read" | "write"
  lastUsedAt: Date | null
  expiresAt: Date | null
}

export function ApiKeysBoard({ keys }: { keys: Row[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [scope, setScope] = useState<"read" | "write">("read")
  const [created, setCreated] = useState<string | null>(null)
  const onError = (error: Error) => toast.error(errorMessage(error))
  const create = useMutation(
    orpc.apiKeys.create.mutationOptions({
      onError,
      onSuccess: (result) => {
        setCreated(result.key)
        setName("")
        router.refresh()
      },
    }),
  )
  const revoke = useMutation(orpc.apiKeys.revoke.mutationOptions({ onError, onSuccess: () => router.refresh() }))

  return (
    <div className="grid max-w-3xl gap-4">
      <Card>
        <CardContent className="grid gap-3">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (name.trim()) create.mutate({ name: name.trim(), scope })
            }}
          >
            <Input
              className="max-w-xs"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Key name, e.g. CI"
            />
            <Button type="button" variant="outline" onClick={() => setScope(scope === "read" ? "write" : "read")}>
              {scope === "read" ? "Read only" : "Read and write"}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Create key
            </Button>
          </form>
          {created && (
            <div className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Copy it now, it is not shown again.</span>
              <code className="break-all bg-muted p-2">{created}</code>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell className="text-muted-foreground">{key.prefix}…</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{key.scope}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {key.lastUsedAt ? <LocalDate value={key.lastUsedAt} /> : "never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => revoke.mutate({ id: key.id })}>
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
