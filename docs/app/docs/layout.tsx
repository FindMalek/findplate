import type { ReactNode } from "react"
import { DocsHeader } from "@/components/docs/docs-header"
import { SidebarNav } from "@/components/docs/sidebar-nav"
import { getNavGroups } from "@/lib/docs-nav"

export default function Layout({ children }: { children: ReactNode }) {
  const groups = getNavGroups()
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-1 flex-col border-x">
      <a
        href="#content"
        className="sr-only z-30 bg-foreground px-4 py-2 font-mono text-background text-xs focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <DocsHeader groups={groups} />
      <div className="flex-1 md:grid md:grid-cols-[13.5rem_minmax(0,1fr)]">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain border-r md:block">
          <SidebarNav groups={groups} />
        </aside>
        <main id="content" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
