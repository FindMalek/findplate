"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex w-full max-w-md items-stretch border bg-card">
      <code className="flex flex-1 items-center gap-2 overflow-x-auto px-4 py-3 font-mono text-sm">
        <span className="select-none text-muted-foreground">$</span>
        <span className="whitespace-nowrap">{command}</span>
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy command"}
        className="flex w-12 items-center justify-center border-l text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      </button>
    </div>
  )
}
