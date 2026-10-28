"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

const BUTTON =
  "inline-flex h-9 items-center gap-2 border px-2.5 font-mono text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"

function CopyMarkdown({ markdownPath }: { markdownPath: string }) {
  const [state, setState] = useState<"idle" | "busy" | "copied" | "failed">("idle")

  async function copy() {
    setState("busy")
    try {
      const text = fetch(markdownPath).then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.text()
      })
      // Safari only allows the clipboard write inside the click, so hand it the pending promise
      if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({ "text/plain": text.then((t) => new Blob([t], { type: "text/plain" })) }),
        ])
      } else {
        await navigator.clipboard.writeText(await text)
      }
      setState("copied")
    } catch {
      setState("failed")
    }
    setTimeout(() => setState("idle"), 2000)
  }

  return (
    <button type="button" onClick={copy} disabled={state === "busy"} className={BUTTON}>
      {state === "copied" ? (
        <CheckIcon aria-hidden className="size-3.5" />
      ) : (
        <CopyIcon aria-hidden className="size-3.5" />
      )}
      <span aria-live="polite">
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy Markdown"}
      </span>
    </button>
  )
}

/** Boxed mono buttons for the page header: copy the page as markdown, open it, or hand it to a chat. */
export function PageActions({ markdownPath, markdownUrl }: { markdownPath: string; markdownUrl: string }) {
  const prompt = `Read ${markdownUrl} so I can ask questions about it.`
  const chat = (base: string, key: string) => `${base}?${new URLSearchParams({ [key]: prompt })}`
  return (
    <div className="mt-8 flex flex-wrap gap-1.5">
      <CopyMarkdown markdownPath={markdownPath} />
      <a href={markdownPath} className={BUTTON}>
        View as Markdown
      </a>
      <a href={chat("https://chatgpt.com/", "q")} target="_blank" rel="noreferrer" className={BUTTON}>
        Open in ChatGPT
      </a>
      <a href={chat("https://claude.ai/new", "q")} target="_blank" rel="noreferrer" className={BUTTON}>
        Open in Claude
      </a>
    </div>
  )
}
