import { notFound } from "next/navigation"
import { findPage, toLlmsPage } from "@/lib/docs-llms"
import { getNavNeighbours } from "@/lib/docs-nav"
import { renderPageMarkdown } from "@/lib/llms"
import { SITE } from "@/lib/site"
import { source } from "@/lib/source"

export const revalidate = false

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const page = findPage(slug)
  if (!page) notFound()
  const llmsPage = await toLlmsPage(page, getNavNeighbours(page.url).group ?? "Docs")
  return new Response(renderPageMarkdown(llmsPage, SITE.url), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept" },
  })
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({ slug: page.slugs.length > 0 ? page.slugs : ["index"] }))
}
