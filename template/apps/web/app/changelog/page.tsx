import type { Metadata } from "next"
import Changelog from "@/content/changelog.mdx"
import { SITE } from "@/lib/site"

export const metadata: Metadata = { title: "Changelog", description: `What changed in ${SITE.name}.` }

export default function ChangelogPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <h1 className="font-heading font-semibold text-3xl tracking-tight">Changelog</h1>
      <Changelog />
    </main>
  )
}
