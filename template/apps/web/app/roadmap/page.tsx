import { Badge } from "@acme/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/components/card"
import type { Metadata } from "next"
import { connection } from "next/server"
import { getRoadmap } from "@/lib/api"
import { SITE } from "@/lib/site"

export const metadata: Metadata = { title: "Roadmap", description: `What's next for ${SITE.name}.` }

export default async function RoadmapPage() {
  await connection()
  const roadmap = await getRoadmap()
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="font-heading font-semibold text-3xl tracking-tight">Roadmap</h1>
      {roadmap.length === 0 && <p className="text-muted-foreground">Nothing planned yet.</p>}
      {roadmap.map((m) => (
        <Card key={m.title}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-4">
              <a href={m.url} target="_blank" rel="noreferrer" className="hover:underline">
                {m.title}
              </a>
              <Badge variant={m.state === "closed" ? "default" : "outline"}>
                {m.state === "closed" ? "shipped" : `${m.progress}%`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-muted-foreground text-sm">
            {m.description && <p>{m.description}</p>}
            <div className="h-1.5 bg-muted">
              <div
                className="h-full w-(--progress) bg-primary"
                style={{ "--progress": `${m.progress}%` } as React.CSSProperties}
              />
            </div>
            <span className="font-mono text-xs">
              {m.closed} done · {m.open} open
            </span>
          </CardContent>
        </Card>
      ))}
    </main>
  )
}
