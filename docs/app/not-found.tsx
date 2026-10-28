import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { SITE } from "@/lib/site"

const LINK =
  "flex items-center justify-between border-b px-6 py-4 font-mono text-sm outline-offset-[-2px] transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring sm:px-8"

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-1 flex-col border-x">
      <header className="flex h-14 items-center justify-between border-b pl-6 sm:pl-8">
        <Link href="/" className="font-mono font-semibold text-sm tracking-tight">
          {SITE.name}
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col">
        <div className="relative flex-1 border-b px-6 pt-20 pb-16 sm:px-8 sm:pt-28">
          <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative">
            <p className="flex items-center gap-3 font-mono text-muted-foreground text-xs uppercase tracking-widest">
              <span>404</span>
              <span aria-hidden className="h-px w-6 bg-border" />
              <span>Not found</span>
            </p>
            <h1 className="mt-6 max-w-2xl text-balance font-semibold text-4xl tracking-tight sm:text-6xl">
              This page does not exist.
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground leading-relaxed">
              It may have moved, or the link is wrong. Try one of these.
            </p>
          </div>
        </div>
        <nav aria-label="Where to go" className="border-t">
          <Link href="/docs" className={LINK}>
            <span>Documentation</span>
            <span aria-hidden>→</span>
          </Link>
          <Link href="/docs/quickstart" className={LINK}>
            <span>Quickstart</span>
            <span aria-hidden>→</span>
          </Link>
          <Link href="/" className={`${LINK} border-b-0`}>
            <span>Home</span>
            <span aria-hidden>→</span>
          </Link>
        </nav>
      </main>
    </div>
  )
}
