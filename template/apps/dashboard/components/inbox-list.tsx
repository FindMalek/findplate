"use client"

import { errorMessage } from "@acme/orpc/errors"
import { orpc } from "@acme/orpc/react"
import { Button } from "@acme/ui/components/button"
import { Card, CardContent } from "@acme/ui/components/card"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LocalDate } from "@/components/local-date"

interface Item {
  id: string
  title: string
  body: string | null
  href: string | null
  readAt: Date | null
  createdAt: Date
}

export function InboxList({ items, unread }: { items: Item[]; unread: number }) {
  const router = useRouter()
  const done = () => router.refresh()
  const onError = (error: Error) => toast.error(errorMessage(error))
  const markRead = useMutation(orpc.inbox.markRead.mutationOptions({ onSuccess: done, onError }))
  const markAll = useMutation(orpc.inbox.markAllRead.mutationOptions({ onSuccess: done, onError }))

  return (
    <div className="grid max-w-2xl gap-3">
      <Button
        variant="outline"
        className="w-fit"
        disabled={unread === 0 || markAll.isPending}
        onClick={() => markAll.mutate({})}
      >
        Mark all read
      </Button>
      {items.length === 0 && <p className="text-muted-foreground text-sm">Nothing here yet.</p>}
      {items.map((item) => (
        <Card key={item.id} className={item.readAt ? "opacity-60" : undefined}>
          <CardContent className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <span className="font-medium">{item.title}</span>
              {item.body && <span className="text-muted-foreground text-sm">{item.body}</span>}
              <span className="text-muted-foreground text-xs">
                <LocalDate value={item.createdAt} />
              </span>
            </div>
            <div className="flex gap-2">
              {item.href && (
                <Button size="sm" variant="ghost" render={<a href={item.href} />}>
                  Open
                </Button>
              )}
              {!item.readAt && (
                <Button size="sm" variant="ghost" onClick={() => markRead.mutate({ id: item.id })}>
                  Mark read
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
