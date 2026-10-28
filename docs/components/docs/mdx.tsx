import { FileIcon, FolderIcon } from "lucide-react"
import Link from "next/link"
import type { ComponentProps, ReactNode } from "react"

type CalloutType = "info" | "note" | "warn" | "warning" | "error" | "success" | "idea"

const CALLOUT_LABEL: Record<CalloutType, string> = {
  info: "Note",
  note: "Note",
  warn: "Warning",
  warning: "Warning",
  error: "Danger",
  success: "Done",
  idea: "Tip",
}

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType
  title?: ReactNode
  children?: ReactNode
}) {
  const strong = type === "warn" || type === "warning" || type === "error"
  return (
    <aside className={`my-6 border ${strong ? "border-foreground" : ""}`}>
      <p className="flex items-center gap-3 border-b px-4 py-2 font-mono text-muted-foreground text-xs uppercase tracking-widest">
        <span className={strong ? "text-foreground" : ""}>{CALLOUT_LABEL[type]}</span>
        {title ? (
          <>
            <span aria-hidden className="h-px w-4 bg-border" />
            <span className="normal-case tracking-normal">{title}</span>
          </>
        ) : null}
      </p>
      <div className="callout-body px-4 py-3 text-sm leading-relaxed">{children}</div>
    </aside>
  )
}

export function Cards({ children }: { children?: ReactNode }) {
  return (
    <div className="not-prose my-6 grid gap-px border bg-border sm:grid-cols-2 [&>*:last-child:nth-child(odd)]:sm:col-span-2">
      {children}
    </div>
  )
}

export function Card({
  title,
  description,
  href,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  href?: string
  children?: ReactNode
}) {
  const body = (
    <>
      <span className="flex items-center justify-between font-semibold text-sm">
        {title}
        {href ? (
          <span
            aria-hidden
            className="font-mono text-muted-foreground transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        ) : null}
      </span>
      {description || children ? (
        <span className="mt-1.5 block text-muted-foreground text-sm leading-relaxed">{description ?? children}</span>
      ) : null}
    </>
  )
  const cls =
    "group block bg-background p-5 outline-offset-[-2px] transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
  if (!href) return <div className={cls}>{body}</div>
  return href.startsWith("http") ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {body}
    </Link>
  )
}

export function Steps({ children }: { children?: ReactNode }) {
  return <div className="docs-steps my-6 border-l pl-6">{children}</div>
}

export function Step({ children }: { children?: ReactNode }) {
  return <div className="docs-step relative pb-6 last:pb-0">{children}</div>
}

export interface TreeNode {
  name: string
  note?: string
  children?: TreeNode[]
}

function TreeRows({ nodes, depth }: { nodes: TreeNode[]; depth: number }) {
  return (
    <ul className={depth > 0 ? "ml-[0.45rem] border-l pl-4" : ""}>
      {nodes.map((node) => (
        <li key={node.name} className="py-1">
          <div className="flex items-baseline gap-x-3">
            {node.children ? (
              <FolderIcon aria-hidden className="size-3.5 shrink-0 translate-y-0.5 text-muted-foreground" />
            ) : (
              <FileIcon aria-hidden className="size-3.5 shrink-0 translate-y-0.5 text-muted-foreground" />
            )}
            <span className="font-medium font-mono text-[13px]">{node.name}</span>
            {node.note ? <span className="text-muted-foreground text-xs">{node.note}</span> : null}
          </div>
          {node.children ? <TreeRows nodes={node.children} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  )
}

export function FileTree({ items, label = "Layout" }: { items: TreeNode[]; label?: string }) {
  return (
    <figure className="not-prose my-6 border">
      <figcaption className="border-b px-4 py-2 font-mono text-muted-foreground text-xs uppercase tracking-widest">
        {label}
      </figcaption>
      <div className="overflow-x-auto p-4">
        <TreeRows nodes={items} depth={0} />
      </div>
    </figure>
  )
}

export function Table(props: ComponentProps<"table">) {
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex lint/a11y/useSemanticElements: keyboard scroll for wide tables
    <div className="docs-table my-6 overflow-x-auto border" tabIndex={0} role="region" aria-label="Table">
      <table {...props} />
    </div>
  )
}
