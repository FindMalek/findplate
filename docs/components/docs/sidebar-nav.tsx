"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { NavGroup } from "@/lib/docs-nav"

export function SidebarNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Documentation" className="text-sm">
      {groups.map((group) => (
        <div key={group.name} className="border-b last:border-b-0">
          <p className="border-b px-5 py-2.5 font-mono text-muted-foreground text-xs uppercase tracking-widest">
            {group.name}
          </p>
          <ul>
            {group.items.map((item) => {
              const active = pathname === item.url
              return (
                <li key={item.url}>
                  <Link
                    href={item.url}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`block border-l-2 px-5 py-1.5 outline-offset-[-2px] transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring ${
                      active
                        ? "border-foreground bg-accent font-medium text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
