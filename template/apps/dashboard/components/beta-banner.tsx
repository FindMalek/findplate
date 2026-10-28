import { getFlag } from "@/lib/flags"

/** The example flag in use: a small badge for whoever `betaBanner` resolves to on. */
export async function BetaBanner() {
  if (!(await getFlag("betaBanner"))) return null
  return (
    <div className="fixed right-4 bottom-4 z-50 border bg-card px-3 py-1.5 font-mono text-muted-foreground text-xs shadow-sm">
      beta
    </div>
  )
}
