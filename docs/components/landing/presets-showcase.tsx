"use client"

import { useState } from "react"
import type { PresetInfo } from "@/lib/landing"

const SWATCHES = ["background", "foreground", "primary", "accent", "border"] as const

function scopedCss(presets: PresetInfo[]): string {
  const vars = (tokens: Record<string, string>) =>
    Object.entries(tokens)
      .map(([k, v]) => `--p-${k}:${v};`)
      .join("")
  return presets
    .map((p) => `[data-preset="${p.id}"]{${vars(p.light)}}.dark [data-preset="${p.id}"]{${vars(p.dark)}}`)
    .join("")
}

export function PresetsShowcase({ presets, createUrl }: { presets: PresetInfo[]; createUrl: string }) {
  const [activeId, setActiveId] = useState(presets[0]?.id ?? "")
  const active = presets.find((p) => p.id === activeId) ?? presets[0]
  if (!active) return null

  return (
    <div>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: css built from the repo's own theme files at build time */}
      <style dangerouslySetInnerHTML={{ __html: scopedCss(presets) }} />
      <div className="grid border-t lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="grid grid-cols-2 divide-x divide-y border-b lg:border-r lg:border-b-0 [&>*]:border-border">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              data-preset={p.id}
              aria-pressed={p.id === active.id}
              onMouseEnter={() => setActiveId(p.id)}
              onFocus={() => setActiveId(p.id)}
              onClick={() => setActiveId(p.id)}
              className="group relative flex flex-col gap-4 p-5 text-left outline-offset-[-2px] transition-colors focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-accent sm:p-6"
            >
              <span className="flex h-9 border" aria-hidden>
                {SWATCHES.map((s) => (
                  <span key={s} className="flex-1" style={{ background: `var(--p-${s})` }} />
                ))}
              </span>
              <span>
                <span className="block font-semibold text-sm">{p.label}</span>
                <span className="mt-1 block font-mono text-muted-foreground text-xs">
                  {p.id} / r {p.radius}
                </span>
              </span>
              <span className="block text-muted-foreground text-xs leading-relaxed">
                {p.fonts.heading && p.fonts.heading !== p.fonts.sans ? `${p.fonts.heading} + ` : ""}
                {p.fonts.sans}
              </span>
            </button>
          ))}
          <div className="col-span-1 p-5 text-muted-foreground text-xs leading-relaxed sm:p-6">
            Not enough? Design any theme on{" "}
            <a
              href={createUrl}
              target="_blank"
              rel="noreferrer"
              className="mx-1 text-foreground underline underline-offset-4"
            >
              shadcn create
            </a>{" "}
            and paste its tokens in.
          </div>
        </div>

        <div className="flex items-center justify-center bg-card p-6 sm:p-10">
          <div
            data-preset={active.id}
            className="w-full max-w-sm overflow-hidden border shadow-sm transition-colors duration-300 motion-reduce:transition-none"
            style={{
              background: "var(--p-background)",
              color: "var(--p-foreground)",
              borderColor: "var(--p-border)",
              borderRadius: "var(--p-radius)",
            }}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3 text-xs"
              style={{ borderColor: "var(--p-border)" }}
            >
              <span className="font-semibold">{active.label}</span>
              <span style={{ color: "var(--p-muted-foreground)" }}>{active.fonts.sans}</span>
            </div>
            <div className="space-y-4 p-5">
              <p className="font-semibold text-lg leading-tight">Invoices for freelancers</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--p-muted-foreground)" }}>
                Same components, other tokens. This is what the dashboard and the landing page of a generated project
                pick up.
              </p>
              <div className="flex gap-2">
                <span
                  className="px-3 py-1.5 font-medium text-xs"
                  style={{
                    background: "var(--p-primary)",
                    color: "var(--p-primary-foreground)",
                    borderRadius: "var(--p-radius)",
                  }}
                >
                  Get started
                </span>
                <span
                  className="border px-3 py-1.5 text-xs"
                  style={{
                    borderColor: "var(--p-border)",
                    background: "var(--p-secondary)",
                    borderRadius: "var(--p-radius)",
                  }}
                >
                  Docs
                </span>
              </div>
              <div
                className="border p-3 text-xs"
                style={{ borderColor: "var(--p-border)", background: "var(--p-card)", borderRadius: "var(--p-radius)" }}
              >
                <div className="flex justify-between">
                  <span>Invoice 0042</span>
                  <span style={{ color: "var(--p-muted-foreground)" }}>paid</span>
                </div>
                <div className="mt-2 h-1.5" style={{ background: "var(--p-accent)", borderRadius: "var(--p-radius)" }}>
                  <div
                    className="h-full w-2/3"
                    style={{ background: "var(--p-primary)", borderRadius: "var(--p-radius)" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="border-t px-6 py-3 font-mono text-muted-foreground text-xs sm:px-8" aria-live="polite">
        {active.description}
      </p>
    </div>
  )
}
