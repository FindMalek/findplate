"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

const COMMANDS = {
  bun: "bunx findplate create",
  pnpm: "pnpm dlx findplate create",
  npm: "npx findplate create",
  yarn: "yarn dlx findplate create",
} as const

type Manager = keyof typeof COMMANDS

export function CopyCommand() {
  const [manager, setManager] = useState<Manager>("bun")
  const [copied, setCopied] = useState(false)
  const command = COMMANDS[manager]

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
    <div className="w-full max-w-md border bg-card">
      <div role="tablist" aria-label="Package manager" className="flex border-b font-mono text-xs">
        {(Object.keys(COMMANDS) as Manager[]).map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={manager === name}
            onClick={() => setManager(name)}
            className={`flex-1 px-3 py-2 transition-colors ${
              manager === name ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="flex items-stretch">
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
    </div>
  )
}
