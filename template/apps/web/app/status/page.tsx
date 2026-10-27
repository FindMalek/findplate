import type { Metadata } from "next"
import { connection } from "next/server"
import { getServices } from "@/lib/api"
import { SITE } from "@/lib/site"

export const metadata: Metadata = { title: "Status", description: `Is ${SITE.name} up?` }

export default async function StatusPage() {
  await connection()
  const services = await getServices()
  const allUp = services?.every((s) => s.ok)
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="font-heading font-semibold text-3xl tracking-tight">Status</h1>
      <p className="text-muted-foreground">
        {!services ? "The status check is unreachable." : allUp ? "All systems operational." : "Something is down."}
      </p>
      <div className="flex flex-col divide-y border bg-card font-mono text-sm">
        {(services ?? []).map((s) => (
          <div key={s.name} className="flex items-center justify-between px-4 py-3">
            <span>{s.name}</span>
            <span className="inline-flex items-center gap-2">
              <span className={s.ok ? "size-1.5 bg-primary" : "size-1.5 bg-destructive"} />
              {s.ok ? (s.ms === null ? "ok" : `ok · ${s.ms} ms`) : "down"}
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
