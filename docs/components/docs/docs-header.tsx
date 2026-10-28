"use client"

import { useSearchContext } from "fumadocs-ui/contexts/search"
import { MenuIcon, SearchIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { SidebarNav } from "@/components/docs/sidebar-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import type { NavGroup } from "@/lib/docs-nav"
import { SITE } from "@/lib/site"

const CELL =
  "flex h-full items-center border-l px-5 hover:bg-accent outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-ring"

function SearchButton() {
  const { setOpenSearch } = useSearchContext()
  return (
    <button
      type="button"
      onClick={() => setOpenSearch(true)}
      aria-label="Search documentation"
      className={`${CELL} gap-3 text-muted-foreground hover:text-foreground`}
    >
      <SearchIcon className="size-4" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden border px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
    </button>
  )
}

function MobileDrawer({ groups }: { groups: NavGroup[] }) {
  const ref = useRef<HTMLDialogElement>(null)
  const pathname = usePathname()

  // biome-ignore lint/correctness/useExhaustiveDependencies: close whenever the route changes
  useEffect(() => {
    ref.current?.close()
  }, [pathname])

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => ref.current?.showModal()}
        className={`${CELL} md:hidden`}
      >
        <MenuIcon className="size-4" />
      </button>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click only, Escape closes natively */}
      <dialog
        ref={ref}
        aria-label="Navigation"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close()
        }}
        className="docs-drawer m-0 h-dvh max-h-none w-[min(20rem,88vw)] max-w-none border-r bg-background p-0 text-foreground backdrop:bg-black/40"
      >
        <div className="flex h-14 items-center justify-between border-b pl-5 font-mono text-sm">
          <span className="font-semibold tracking-tight">{SITE.name}</span>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => ref.current?.close()}
            className="flex size-14 items-center justify-center border-l outline-offset-[-2px] hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <div className="h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain">
          <div className="flex border-b font-mono text-xs">
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              className="flex-1 px-5 py-3 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              GitHub
            </a>
          </div>
          <SidebarNav groups={groups} />
        </div>
      </dialog>
    </>
  )
}

export function DocsHeader({ groups }: { groups: NavGroup[] }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background pl-6 sm:pl-8">
      <Link
        href="/"
        className="font-mono font-semibold text-sm tracking-tight outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
      >
        {SITE.name}
      </Link>
      <nav aria-label="Primary" className="flex h-full items-center font-mono text-xs">
        <SearchButton />
        <Link href="/docs" className={`${CELL} hidden sm:flex`}>
          Docs
        </Link>
        <a href={SITE.github} target="_blank" rel="noreferrer" className={`${CELL} hidden sm:flex`}>
          GitHub
        </a>
        <ThemeToggle />
        <MobileDrawer groups={groups} />
      </nav>
    </header>
  )
}
