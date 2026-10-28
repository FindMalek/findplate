import { getLlmsGroups } from "@/lib/docs-llms"
import { renderLlmsIndex } from "@/lib/llms"
import { SITE } from "@/lib/site"

export const revalidate = false

export async function GET() {
  const groups = await getLlmsGroups()
  const body = renderLlmsIndex({
    name: SITE.name,
    summary: SITE.pitch,
    base: SITE.url,
    groups,
    optional: [
      { title: "llms-full.txt", url: `${SITE.url}/llms-full.txt`, description: "Every docs page in one markdown file" },
      { title: "docs.json", url: `${SITE.url}/docs.json`, description: "Machine-readable page index with headings" },
      { title: "sitemap.xml", url: `${SITE.url}/sitemap.xml`, description: "HTML and markdown urls of every page" },
      { title: "GitHub", url: SITE.github, description: "Source code, issues and releases" },
    ],
  })
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
}
