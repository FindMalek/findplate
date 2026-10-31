"use client"

import { errorMessage } from "@acme/orpc/errors"
import { orpc } from "@acme/orpc/react"
import { Button } from "@acme/ui/components/button"
import { Input } from "@acme/ui/components/input"
import { Textarea } from "@acme/ui/components/textarea"
import { useMutation } from "@tanstack/react-query"
import { MessageSquareIcon } from "lucide-react"
import { useState } from "react"

/** A small button bottom left that opens a form and files the answer as a GitHub issue. */
export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [note, setNote] = useState<string | null>(null)
  const send = useMutation(
    orpc.feedback.send.mutationOptions({
      onSuccess: () => {
        setNote("Thanks, we got it.")
        setMessage("")
        setOpen(false)
      },
      onError: (error) => setNote(errorMessage(error)),
    }),
  )

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {open ? (
        <form
          className="grid w-72 gap-2 border bg-card p-3 shadow-lg"
          onSubmit={(event) => {
            event.preventDefault()
            send.mutate({ message, email, website, page: window.location.pathname })
          }}
        >
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="What could be better?"
          />
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email (optional)"
          />
          <input
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="absolute -left-[9999px]"
            name="website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={send.isPending || message.trim().length < 5}>
              Send
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setNote(null)
              setOpen(true)
            }}
          >
            <MessageSquareIcon /> Feedback
          </Button>
          {note && <span className="text-muted-foreground text-xs">{note}</span>}
        </div>
      )}
    </div>
  )
}
