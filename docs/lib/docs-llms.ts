import { getMarkdownComponents } from "@/components/docs/markdown"
import { getNavGroups } from "@/lib/docs-nav"
import type { LlmsGroup, LlmsPage } from "@/lib/llms"
import { source } from "@/lib/source"

type DocsPage = NonNullable<ReturnType<typeof source.getPage>>

export async function toLlmsPage(page: DocsPage, group: string): Promise<LlmsPage> {
  return {
    title: page.data.title,
    description: page.data.description,
    url: page.url,
    group,
    body: await page.data.getText("processed", { components: getMarkdownComponents() }),
  }
}

/** Pages grouped and ordered like the sidebar (the `---Label---` separators in meta.json). */
export async function getLlmsGroups(): Promise<LlmsGroup[]> {
  return Promise.all(
    getNavGroups().map(async (group) => ({
      name: group.name,
      pages: await Promise.all(
        group.items.map(async (item) => {
          const page = source.getPages().find((p) => p.url === item.url)
          if (!page) throw new Error(`nav item without a page: ${item.url}`)
          return toLlmsPage(page, group.name)
        }),
      ),
    })),
  )
}

export function findPage(slug: string[]): DocsPage | undefined {
  return source.getPage(slug.length === 1 && slug[0] === "index" ? [] : slug)
}
