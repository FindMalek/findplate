"use client"

import { AnchorProvider, TOCItem, type TOCItemType } from "fumadocs-core/toc"
import { useEffect, useRef } from "react"

function Progress() {
  const bar = useRef<HTMLSpanElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((window.scrollY / max) * 100))) : 0
      bar.current?.style.setProperty("--p", `${pct}%`)
      if (label.current) label.current.textContent = `${pct}%`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <span ref={label} aria-hidden>
        0%
      </span>
      <span
        ref={bar}
        aria-hidden
        className="absolute inset-x-0 bottom-[-1px] h-px bg-foreground"
        style={{ width: "var(--p, 0%)" }}
      />
    </>
  )
}

export function Toc({ items }: { items: TOCItemType[] }) {
  return (
    <AnchorProvider toc={items}>
      <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain">
        <div className="relative flex items-center justify-between border-b px-5 py-2.5 font-mono text-muted-foreground text-xs uppercase tracking-widest">
          <span>On this page</span>
          <Progress />
        </div>
        <ul className="py-3 text-[13px] leading-snug">
          {items.map((item) => (
            <li key={item.url}>
              <TOCItem
                href={item.url}
                className={`block border-l-2 border-transparent py-1.5 pr-4 text-muted-foreground outline-offset-[-2px] transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring data-[active=true]:border-foreground data-[active=true]:font-medium data-[active=true]:text-foreground ${
                  item.depth >= 3 ? "pl-8" : "pl-5"
                }`}
              >
                {item.title}
              </TOCItem>
            </li>
          ))}
        </ul>
      </div>
    </AnchorProvider>
  )
}

export function MobileToc({ items }: { items: TOCItemType[] }) {
  return (
    <details className="group border-b lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-3 font-mono text-muted-foreground text-xs uppercase tracking-widest outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-ring sm:px-8">
        <span>On this page</span>
        <span aria-hidden className="transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <ul className="border-t py-2 text-sm">
        {items.map((item) => (
          <li key={item.url}>
            <a
              href={item.url}
              className={`block py-1.5 pr-6 text-muted-foreground hover:text-foreground ${item.depth >= 3 ? "pl-10 sm:pl-12" : "pl-6 sm:pl-8"}`}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
