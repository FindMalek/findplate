"use client"

import type { FlagName } from "@acme/flags"
import { errorMessage } from "@acme/orpc/errors"
import { orpc } from "@acme/orpc/react"
import { Badge } from "@acme/ui/components/badge"
import { Button } from "@acme/ui/components/button"
import { Card, CardContent } from "@acme/ui/components/card"
import { Input } from "@acme/ui/components/input"
import { Switch } from "@acme/ui/components/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@acme/ui/components/table"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface FlagRow {
  name: FlagName
  description: string
  default: boolean
  source: "env" | "db" | "default"
  stored: number | null
  envRule: number | null
  enabled: boolean
}

function FlagLine({ flag }: { flag: FlagRow }) {
  const router = useRouter()
  const current = flag.envRule ?? flag.stored ?? (flag.default ? 100 : 0)
  const [rollout, setRollout] = useState(String(current))
  const locked = flag.envRule !== null
  const done = () => router.refresh()
  const onError = (error: Error) => toast.error(errorMessage(error))
  const set = useMutation(orpc.flags.set.mutationOptions({ onSuccess: done, onError }))
  const reset = useMutation(orpc.flags.reset.mutationOptions({ onSuccess: done, onError }))
  const save = (value: number) => {
    if (Number.isInteger(value) && value >= 0 && value <= 100) set.mutate({ name: flag.name, rollout: value })
  }

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{flag.name}</div>
        <div className="text-muted-foreground text-sm">{flag.description}</div>
      </TableCell>
      <TableCell>
        <Badge variant={flag.source === "default" ? "outline" : "secondary"}>{flag.source}</Badge>
      </TableCell>
      <TableCell>
        <Switch
          aria-label={`Turn ${flag.name} on for everyone`}
          checked={current >= 100}
          disabled={locked || set.isPending}
          onCheckedChange={(on) => {
            setRollout(on ? "100" : "0")
            save(on ? 100 : 0)
          }}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            className="w-20"
            aria-label={`${flag.name} rollout percent`}
            value={rollout}
            disabled={locked}
            onChange={(event) => setRollout(event.target.value)}
          />
          <Button size="sm" disabled={locked || set.isPending} onClick={() => save(Number(rollout))}>
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={locked || flag.stored === null || reset.isPending}
            onClick={() => reset.mutate({ name: flag.name })}
          >
            Reset
          </Button>
        </div>
        {locked && <p className="mt-1 text-right text-muted-foreground text-xs">Set by FLAGS_OVERRIDE</p>}
      </TableCell>
    </TableRow>
  )
}

export function FlagsBoard({ flags }: { flags: FlagRow[] }) {
  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flag</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Everyone</TableHead>
              <TableHead className="text-right">Rollout %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flags.map((flag) => (
              <FlagLine key={`${flag.name}:${flag.envRule ?? flag.stored}`} flag={flag} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
