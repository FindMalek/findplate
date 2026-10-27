import type { ReactNode } from "react"

export function Box({
  index,
  label,
  title,
  children,
  id,
}: {
  index: string
  label: string
  title: string
  children: ReactNode
  id?: string
}) {
  return (
    <section id={id} aria-labelledby={`${id ?? label}-title`} className="border-b">
      <div className="flex items-center gap-3 border-b px-6 py-3 font-mono text-muted-foreground text-xs uppercase tracking-widest sm:px-8">
        <span>{index}</span>
        <span aria-hidden className="h-px w-6 bg-border" />
        <span>{label}</span>
      </div>
      <div className="px-6 pt-10 pb-8 sm:px-8 sm:pt-14">
        <h2
          id={`${id ?? label}-title`}
          className="max-w-2xl text-balance font-semibold text-2xl tracking-tight sm:text-4xl"
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="max-w-xl px-6 pb-10 text-muted-foreground leading-relaxed sm:px-8">{children}</p>
}
