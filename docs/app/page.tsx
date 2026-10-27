import { ArrowRightIcon, ArrowUpRightIcon } from "lucide-react"
import Link from "next/link"
import { CopyCommand } from "@/components/copy-command"
import { Box, Lead } from "@/components/landing/box"
import { PresetsShowcase } from "@/components/landing/presets-showcase"
import { Terminal } from "@/components/landing/terminal"
import { ThemeToggle } from "@/components/theme-toggle"
import { getModules, getPresets, getSkillCount } from "@/lib/landing"
import { SITE } from "@/lib/site"

const CELL = "group flex items-center justify-between px-6 py-5 text-sm transition-colors hover:bg-accent sm:px-8"
const FOCUS = "outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-ring"

const APPS: [string, string][] = [
  ["apps/web", "hero landing, next"],
  ["apps/dashboard", "better-auth login and app shell, next"],
  ["apps/api", "orpc on bun, the only app that touches data"],
  ["apps/docs", "fumadocs about your project, optional"],
]

const PACKAGES: [string, string][] = [
  ["packages/ui", "shadcn components and theme tokens"],
  ["packages/orpc", "procedures and typed clients"],
  ["packages/db", "drizzle schema, migrations, seed"],
  ["packages/auth", "better-auth setup"],
  ["packages/env", "zod-validated env, one root .env"],
  ["packages/common", "shared schemas, constants, utils"],
  ["packages/storage", "s3 uploads, optional"],
  ["packages/ai", "AI SDK, optional"],
]

const ROOT_FILES: [string, string][] = [
  [".ruler/", "one source of agent rules and skills"],
  [".github/", "ci, pr hygiene, previews, issue templates"],
  ["docker/", "local postgres compose file"],
  [".env", "generated, secrets filled in"],
]

const AGENTS = ["Claude Code", "Cursor", "opencode", "Zed", "oh-my-pi"]
const SKILLS = ["dive-ticket", "plan-ticket", "ship", "review-ticket", "triage-reviews"]
const GITHUB = ["repo", "project board", "labels", "milestones", "main ruleset"]

function TreeGroup({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="p-6 sm:p-8">
      <p className="mb-5 font-mono text-muted-foreground text-xs uppercase tracking-widest">{title}</p>
      <ul className="space-y-3">
        {rows.map(([path, caption], i) => (
          <li key={path} className="grid grid-cols-[1.25rem_1fr] gap-x-1 font-mono text-[13px] leading-snug">
            <span aria-hidden className="text-muted-foreground">
              {i === rows.length - 1 ? "└" : "├"}
            </span>
            <span>
              <span className="font-medium">{path}</span>
              <span className="mt-0.5 block font-sans text-muted-foreground text-xs">{caption}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item} className="border px-2 py-1 font-mono text-xs">
          {item}
        </li>
      ))}
    </ul>
  )
}

function Cell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 sm:p-8">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="mt-2 text-muted-foreground text-sm leading-relaxed">{children}</div>
    </div>
  )
}

export default function HomePage() {
  const modules = getModules()
  const presets = getPresets()
  const skillCount = getSkillCount()
  const defaults = modules.filter((m) => m.isDefault).map((m) => m.id)
  const [before = "", after = ""] = SITE.pitch.split("full-stack")
  const stats: [string, string][] = [
    [String(modules.length), "optional modules"],
    [String(presets.length), "design presets"],
    [String(skillCount), "agent skills"],
    ["~48s", "create, install included"],
  ]

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-1 flex-col border-x">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background pl-6 sm:pl-8">
        <span className="font-mono font-semibold text-sm tracking-tight">{SITE.name}</span>
        <nav aria-label="Primary" className="flex h-full items-center font-mono text-xs">
          <Link href="/docs" className={`hidden h-full items-center border-l px-5 hover:bg-accent sm:flex ${FOCUS}`}>
            Docs
          </Link>
          <a
            href={SITE.github}
            target="_blank"
            rel="noreferrer"
            className={`hidden h-full items-center border-l px-5 hover:bg-accent sm:flex ${FOCUS}`}
          >
            GitHub
          </a>
          <ThemeToggle />
        </nav>
      </header>

      <section className="relative flex flex-col border-b">
        <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
        <div className="rise relative flex flex-col items-center justify-center gap-8 px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-24">
          <p className="border px-3 py-1 font-mono text-muted-foreground text-xs">MIT / open source</p>
          <h1 className="max-w-3xl text-balance font-semibold text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            {before}
            <span className="whitespace-nowrap">full-stack</span>
            {after}
          </h1>
          <p className="max-w-lg text-balance text-muted-foreground leading-relaxed">
            Web, dashboard, api, auth, database, agent rules and a GitHub board, wired together and building green on
            the first run.
          </p>
          <CopyCommand />
          <div className="flex flex-wrap justify-center gap-3 font-mono text-xs">
            <Link
              href="/docs"
              className={`group flex items-center gap-2 border bg-foreground px-5 py-2.5 text-background transition-opacity hover:opacity-85 ${FOCUS}`}
            >
              Read the docs
              <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              className={`group flex items-center gap-2 border px-5 py-2.5 transition-colors hover:bg-accent ${FOCUS}`}
            >
              GitHub
              <ArrowUpRightIcon className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
        <dl className="relative grid grid-cols-2 divide-x border-t bg-background sm:grid-cols-4">
          {stats.map(([value, label], i) => (
            <div key={label} className={`px-6 py-5 sm:px-8 ${i > 1 ? "max-sm:border-t" : ""}`}>
              <dt className="sr-only">{label}</dt>
              <dd className="font-semibold text-2xl tracking-tight">{value}</dd>
              <dd className="mt-1 text-muted-foreground text-xs">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Box index="01" label="create" title="Four questions, then a project that runs.">
        <Lead>
          Name, pitch, preset, modules. The cli copies the template, writes agent rules, installs skills and
          dependencies, formats, and makes the first commit.
        </Lead>
        <Terminal modules={defaults} />
      </Box>

      <Box index="02" label="what you get" title="A turborepo with a clear rule.">
        <Lead>
          <code className="font-mono text-foreground text-sm">apps/api</code> is the only app that touches the database,
          auth, storage and providers. The frontends stay thin.
        </Lead>
        <div className="grid divide-y border-t md:grid-cols-3 md:divide-x md:divide-y-0">
          <TreeGroup title="apps/" rows={APPS} />
          <TreeGroup title="packages/" rows={PACKAGES} />
          <TreeGroup title="root" rows={ROOT_FILES} />
        </div>
      </Box>

      <Box index="03" label="modules" title={`${modules.length} modules. Switch each on or off.`}>
        <Lead>
          Off means gone: the package, its env keys and every line between the module markers are removed at generation,
          not hidden behind a flag.
        </Lead>
        <div className="overflow-hidden border-t">
          <ul className="-mr-px -mb-px grid sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <li key={m.id} className="border-r border-b">
                <Link
                  href={m.href}
                  className={`group flex h-full flex-col gap-2 p-5 transition-colors hover:bg-accent sm:p-6 ${FOCUS}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-sm">{m.label}</span>
                    <span
                      className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                        m.isDefault ? "bg-foreground text-background" : "text-muted-foreground"
                      }`}
                    >
                      {m.isDefault ? "on" : "off"}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-xs leading-relaxed">{m.hint}</span>
                  <span className="mt-auto pt-2 font-mono text-muted-foreground text-xs transition-colors group-hover:text-foreground">
                    {m.id}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Box>

      <Box index="04" label="presets" title="Five looks. Bring any theme.">
        <Lead>
          A preset swaps the color tokens, radius, fonts and shadcn style. Hover one to see the same screen under its
          tokens.
        </Lead>
        <PresetsShowcase presets={presets} createUrl={SITE.shadcnCreate} />
      </Box>

      <Box index="05" label="agents and workflow" title="Ready for you and your coding agents.">
        <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0 [&>*]:border-border">
          <Cell title="One rulebook, every agent">
            <code className="font-mono text-foreground text-xs">.ruler/AGENTS.md</code> is compiled by ruler for:
            <Chips items={AGENTS} />
          </Cell>
          <Cell title="Skills for the ticket loop">
            Project skills copied into each agent.
            <Chips items={SKILLS} />
          </Cell>
        </div>
        <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0">
          <Cell title="GitHub, provisioned">
            <code className="font-mono text-foreground text-xs">findplate github</code> sets up, safe to rerun:
            <Chips items={GITHUB} />
          </Cell>
          <Cell title="Previews on your own Dokploy">
            Every pull request gets a preview per app and one comment, updated on each push, with status, link and the
            build error. Production stays on Vercel.
          </Cell>
        </div>
        <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0">
          <Cell title="CI that builds the generator">
            The template is generated with every module on, none, and each one alone, then built.
          </Cell>
          <Cell title="Stays current">
            <code className="font-mono text-foreground text-xs">findplate add</code>,{" "}
            <code className="font-mono text-foreground text-xs">update</code> and{" "}
            <code className="font-mono text-foreground text-xs">doctor</code> work on projects you already generated.
          </Cell>
        </div>
      </Box>

      <Box index="06" label="deploy" title="Vercel or your own server.">
        <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0">
          <Link href="/docs/deploy" className={`group block p-6 transition-colors hover:bg-accent sm:p-8 ${FOCUS}`}>
            <h3 className="font-semibold text-sm">Vercel</h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              Import <code className="font-mono text-xs">apps/web</code> and{" "}
              <code className="font-mono text-xs">apps/dashboard</code> as two projects, host the api on bun or docker.
            </p>
            <p className="mt-5 flex items-center gap-1.5 font-mono text-xs">
              Deploy guide <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
            </p>
          </Link>
          <Link
            href="/docs/deploy#self-host-with-docker"
            className={`group block p-6 transition-colors hover:bg-accent sm:p-8 ${FOCUS}`}
          >
            <h3 className="font-semibold text-sm">Self-host</h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              A Dockerfile per app, standalone Next builds with healthchecks. The same images run on Dokploy or anywhere
              docker runs.
            </p>
            <p className="mt-5 flex items-center gap-1.5 font-mono text-xs">
              Docker and Dokploy <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
            </p>
          </Link>
        </div>
      </Box>

      <section className="relative flex flex-col items-center gap-8 px-6 py-20 text-center sm:py-28">
        <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
        <h2 className="relative max-w-xl text-balance font-semibold text-3xl tracking-tight sm:text-5xl">
          Start the next one in a minute.
        </h2>
        <div className="relative flex w-full justify-center">
          <CopyCommand />
        </div>
      </section>

      <footer className="mt-auto grid grid-cols-1 divide-y border-t sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Link href="/docs" className={`${CELL} ${FOCUS}`}>
          Documentation
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <a href={SITE.github} target="_blank" rel="noreferrer" className={`${CELL} ${FOCUS}`}>
          GitHub
          <ArrowUpRightIcon className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
        <p className="flex items-center px-6 py-5 font-mono text-muted-foreground text-xs sm:px-8">MIT licensed</p>
      </footer>
    </main>
  )
}
