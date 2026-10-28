import { ArrowUpRightIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MobileToc, Toc } from "@/components/docs/toc"
import { getNavNeighbours, type NavItem } from "@/lib/docs-nav"
import { SITE } from "@/lib/site"
import { source } from "@/lib/source"
import { getMDXComponents } from "@/mdx-components"

type Props = { params: Promise<{ slug?: string[] }> }

const ENTRY_POINTS = ["quickstart", "cli", "modules", "presets", "deploy", "agents"]

function Pager({ prev, next }: { prev?: NavItem; next?: NavItem }) {
  const cell =
    "group flex flex-col gap-1 p-5 outline-offset-[-2px] transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring sm:px-8"
  return (
    <nav aria-label="Pagination" className="grid grid-cols-2 border-t">
      {prev ? (
        <Link href={prev.url} className={`${cell} border-r`}>
          <span className="font-mono text-muted-foreground text-xs uppercase tracking-widest">← Previous</span>
          <span className="font-medium text-sm">{prev.name}</span>
        </Link>
      ) : (
        <span className="border-r" />
      )}
      {next ? (
        <Link href={next.url} className={`${cell} items-end text-right`}>
          <span className="font-mono text-muted-foreground text-xs uppercase tracking-widest">Next →</span>
          <span className="font-medium text-sm">{next.name}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}

function EntryGrid() {
  const entries = ENTRY_POINTS.map((slug) => source.getPage([slug])).filter((p) => p !== undefined)
  return (
    <div className="grid gap-px border-y bg-border sm:grid-cols-2">
      {entries.map((entry, i) => (
        <Link
          key={entry.url}
          href={entry.url}
          className="group flex min-h-40 flex-col bg-background p-6 outline-offset-[-2px] transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring sm:p-8"
        >
          <span className="flex items-center justify-between font-mono text-muted-foreground text-xs uppercase tracking-widest">
            <span>{String(i + 1).padStart(2, "0")}</span>
            <ArrowUpRightIcon
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
          <span className="mt-auto pt-10 font-semibold text-xl tracking-tight">{entry.data.title}</span>
          <span className="mt-2 text-muted-foreground text-sm leading-relaxed">{entry.data.description}</span>
        </Link>
      ))}
    </div>
  )
}

export default async function Page(props: Props) {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) notFound()
  const MDX = page.data.body
  const isHome = !slug || slug.length === 0
  const { group, prev, next } = getNavNeighbours(page.url)
  const toc = page.data.toc.filter((item) => item.depth <= 3)
  const editUrl = `${SITE.github}/edit/main/docs/content/docs/${page.path}`

  return (
    <div className={isHome ? "" : "lg:grid lg:grid-cols-[minmax(0,1fr)_12.5rem]"}>
      <div className={`min-w-0 ${isHome ? "" : "lg:border-r"}`}>
        <header className="border-b px-6 pt-10 pb-8 sm:px-8 sm:pt-14">
          <p className="flex items-center gap-3 font-mono text-muted-foreground text-xs uppercase tracking-widest">
            <span>Docs</span>
            {group ? (
              <>
                <span aria-hidden className="h-px w-6 bg-border" />
                <span>{group}</span>
              </>
            ) : null}
          </p>
          <h1 className="mt-6 max-w-2xl text-balance font-semibold text-3xl tracking-tight sm:text-5xl">
            {isHome ? "Documentation" : page.data.title}
          </h1>
          {page.data.description ? (
            <p className="mt-4 max-w-xl text-pretty text-lg text-muted-foreground leading-relaxed">
              {page.data.description}
            </p>
          ) : null}
        </header>
        {isHome ? <EntryGrid /> : null}
        {toc.length > 0 && !isHome ? <MobileToc items={toc} /> : null}
        <article className="docs-prose px-6 py-10 sm:px-8">
          <MDX components={getMDXComponents()} />
        </article>
        <div className="flex items-center justify-between border-t px-6 py-3 font-mono text-muted-foreground text-xs sm:px-8">
          <a
            href={editUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 py-1 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            Edit on GitHub
            <ArrowUpRightIcon aria-hidden className="size-3.5" />
          </a>
        </div>
        <Pager prev={prev} next={next} />
      </div>
      {toc.length > 0 && !isHome ? (
        <aside aria-label="On this page" className="hidden lg:block">
          <Toc items={toc} />
        </aside>
      ) : null}
    </div>
  )
}

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) notFound()
  const image = `/og${slug?.length ? `/${slug.join("/")}` : ""}`
  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: { images: [{ url: image, width: 1200, height: 630 }] },
  }
}
