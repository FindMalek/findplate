import { ArrowRightIcon, ArrowUpRightIcon } from "lucide-react"
import Link from "next/link"
import { CopyCommand } from "@/components/copy-command"
import { ThemeToggle } from "@/components/theme-toggle"
import { SITE } from "@/lib/site"

const CELL = "group flex items-center justify-between px-6 py-5 text-sm transition-colors hover:bg-accent sm:px-8"

export default function HomePage() {
  const [before = "", after = ""] = SITE.pitch.split("full-stack")
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-1 flex-col border-x">
      <header className="flex h-14 items-center justify-between border-b pl-6 sm:pl-8">
        <span className="font-mono font-semibold text-sm tracking-tight">{SITE.name}</span>
        <ThemeToggle />
      </header>

      <section className="relative flex flex-1 flex-col items-center justify-center gap-10 px-6 py-24 text-center">
        <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
        <h1 className="relative max-w-3xl text-balance font-semibold text-4xl leading-[1.05] tracking-tight sm:text-6xl">
          {before}
          <span className="whitespace-nowrap">full-stack</span>
          {after}
        </h1>
        <div className="relative flex w-full justify-center">
          <CopyCommand command={SITE.command} />
        </div>
      </section>

      <nav className="grid grid-cols-2 border-t divide-x">
        <Link href="/docs" className={CELL}>
          Documentation
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <a href={SITE.github} target="_blank" rel="noreferrer" className={CELL}>
          GitHub
          <ArrowUpRightIcon className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </nav>
    </main>
  )
}
