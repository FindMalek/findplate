"use client"

import { orpc } from "@acme/orpc/react"
import { Input } from "@acme/ui/components/input"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

/** Splits Postgres' `<mark>` highlights into text and marks, so note text is never rendered as html. */
function Highlighted({ text }: { text: string }) {
  return (
    <>
      {text.split(/(<mark>.*?<\/mark>)/g).map((part, index) =>
        part.startsWith("<mark>") ? (
          <mark key={index} className="bg-primary/20 text-foreground">
            {part.slice(6, -7)}
          </mark>
        ) : (
          <span key={index}>{part.replace(/<\/?mark>/g, "")}</span>
        ),
      )}
    </>
  )
}

export function NotesSearch() {
  const [text, setText] = useState("")
  const [q, setQ] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), 250)
    return () => clearTimeout(timer)
  }, [text])
  const { data } = useQuery({ ...orpc.notes.search.queryOptions({ input: { q } }), enabled: q.length > 0 })

  return (
    <div className="grid max-w-3xl gap-2 px-4 pt-4 md:px-6">
      <Input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Search notes"
        aria-label="Search notes"
      />
      {q && data && (
        <ul className="grid gap-2 text-sm">
          {data.length === 0 && <li className="text-muted-foreground">No notes match.</li>}
          {data.map((hit) => (
            <li key={hit.id} className="border p-2">
              <div className="font-medium">{hit.title}</div>
              <div className="text-muted-foreground">
                <Highlighted text={hit.headline} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
