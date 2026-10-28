import { getNavGroups } from "@/lib/docs-nav"
import { markdownPath, nodeText } from "@/lib/llms"
import { SITE } from "@/lib/site"
import { source } from "@/lib/source"

export const revalidate = false

export function GET() {
  const pages = getNavGroups().flatMap((group) =>
    group.items.flatMap((item) => {
      const page = source.getPages().find((p) => p.url === item.url)
      if (!page) return []
      return [
        {
          slug: page.slugs.join("/") || "index",
          title: page.data.title,
          description: page.data.description ?? "",
          group: group.name,
          url: `${SITE.url}${page.url}`,
          markdown: `${SITE.url}${markdownPath(page.url)}`,
          headings: page.data.toc.map((h) => ({
            depth: h.depth,
            title: nodeText(h.title),
            id: String(h.url).replace(/^#/, ""),
          })),
        },
      ]
    }),
  )
  return Response.json({
    name: SITE.name,
    url: SITE.url,
    llms: `${SITE.url}/llms.txt`,
    full: `${SITE.url}/llms-full.txt`,
    pages,
  })
}
