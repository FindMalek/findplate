"use client"

import { RotateCcwIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

type State = "static" | "idle" | "play"

const STEPS = [
  "Copying the template",
  "Generating agent rules",
  "Installing agent skills",
  "Installing dependencies",
  "Formatting",
  "Creating the git repository",
]

const STEP = 0.55
const PROMPT_START = 0.5
const PROMPT_GAP = 1.1
const STEPS_START = PROMPT_START + PROMPT_GAP * 4 + 0.3

export function Terminal({ modules }: { modules: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<State>("static")

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    setState("idle")
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setState("play")
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function replay() {
    setState("idle")
    requestAnimationFrame(() => requestAnimationFrame(() => setState("play")))
  }

  const prompts: [string, string][] = [
    ["Project name", "my-app"],
    ["Pitch", "Invoices for freelancers"],
    ["Preset", "monochrome"],
    ["Modules", modules.join(", ")],
  ]
  const nextStart = STEPS_START + STEPS.length * STEP + 0.3

  return (
    <div ref={ref} data-state={state} className="term relative border-t bg-card font-mono text-[13px] leading-7">
      <div className="flex items-center justify-between border-b px-4 py-2 text-muted-foreground text-xs sm:px-6">
        <span>~/projects</span>
        <button
          type="button"
          onClick={replay}
          className="term-replay flex items-center gap-1.5 px-2 py-1 transition-colors hover:text-foreground"
        >
          <RotateCcwIcon className="size-3" aria-hidden />
          replay
        </button>
      </div>
      <div className="overflow-x-auto px-4 py-5 sm:px-6" role="img" aria-label="Terminal recording of findplate create">
        <div className="min-w-[34rem]">
          <p>
            <span className="text-muted-foreground">$ </span>
            bunx findplate create
          </p>
          {prompts.map(([label, value], i) => (
            <p
              key={label}
              className="term-row"
              style={{ "--d": `${PROMPT_START + i * PROMPT_GAP}s` } as React.CSSProperties}
            >
              <span className="text-muted-foreground">{"? "}</span>
              <span className="inline-block w-28">{label}</span>
              <span
                className="term-type inline-block overflow-hidden whitespace-nowrap align-bottom"
                style={
                  { "--n": value.length, "--td": `${PROMPT_START + i * PROMPT_GAP + 0.15}s` } as React.CSSProperties
                }
              >
                {value}
              </span>
            </p>
          ))}
          <p className="h-3" aria-hidden />
          {STEPS.map((step, i) => (
            <p key={step} className="term-row" style={{ "--d": `${STEPS_START + i * STEP}s` } as React.CSSProperties}>
              <span className="relative inline-block h-7 w-5 align-top">
                <span className="term-spin absolute inset-0 text-muted-foreground">*</span>
                <span className="term-done absolute inset-0">&#10003;</span>
              </span>
              {step}
            </p>
          ))}
          <div
            className="term-row mt-4 inline-block min-w-72 border px-4 py-2"
            style={{ "--d": `${nextStart}s` } as React.CSSProperties}
          >
            <p className="text-muted-foreground text-xs uppercase tracking-widest">Next</p>
            <p>cd my-app</p>
            <p>
              pnpm db:up <span className="text-muted-foreground">postgres on :5432</span>
            </p>
            <p>
              pnpm dev <span className="text-muted-foreground">web :3000 / api :3001 / dashboard :3002</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
