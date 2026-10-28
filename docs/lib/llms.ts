export interface LlmsPage {
  title: string
  description?: string
  /** Page url like `/docs/cli`. The docs home is `/docs`. */
  url: string
  group: string
  body: string
}

export interface LlmsGroup {
  name: string
  pages: LlmsPage[]
}

/** Plain text of a toc title, which fumadocs hands over as a react node. */
export function nodeText(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join("")
  if (node && typeof node === "object" && "props" in node)
    return nodeText((node.props as { children?: unknown }).children)
  return ""
}

/** `/docs` -> `/docs/index.md`, `/docs/cli` -> `/docs/cli.md` */
export function markdownPath(pageUrl: string): string {
  return pageUrl === "/docs" ? "/docs/index.md" : `${pageUrl}.md`
}

/** Point internal links at the markdown twin of the page, so an agent keeps reading markdown. */
export function absolutizeLinks(markdown: string, base: string): string {
  let fenced = false
  return markdown
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
      if (fenced) return line
      return line.replace(/\]\((\/docs[^)\s]*)\)/g, (_, href: string) => {
        const [path = "", hash = ""] = href.split(/(?=#)/)
        return `](${base}${markdownPath(path.replace(/\/$/, ""))}${hash})`
      })
    })
    .join("\n")
}

export function renderPageMarkdown(page: LlmsPage, base: string): string {
  const lines = [
    "---",
    `title: ${JSON.stringify(page.title)}`,
    ...(page.description ? [`description: ${JSON.stringify(page.description)}`] : []),
    `url: ${base}${page.url}`,
    `markdown: ${base}${markdownPath(page.url)}`,
    `group: ${JSON.stringify(page.group)}`,
    "---",
  ]
  return `${lines.join("\n")}\n\n# ${page.title}\n\n${absolutizeLinks(page.body, base).trim()}\n`
}

export function renderLlmsIndex({
  name,
  summary,
  base,
  groups,
  optional,
}: {
  name: string
  summary: string
  base: string
  groups: LlmsGroup[]
  optional: { title: string; url: string; description: string }[]
}): string {
  const sections = groups.map((group) => {
    const links = group.pages.map(
      (page) => `- [${page.title}](${base}${markdownPath(page.url)})${page.description ? `: ${page.description}` : ""}`,
    )
    return `## ${group.name}\n\n${links.join("\n")}`
  })
  const extras = optional.map((item) => `- [${item.title}](${item.url}): ${item.description}`)
  return `# ${name}\n\n> ${summary}\n\nEvery link below is the raw markdown of a docs page. Append \`.md\` to any docs url, or send \`Accept: text/markdown\`.\n\n${sections.join("\n\n")}\n\n## Optional\n\n${extras.join("\n")}\n`
}

export function renderLlmsFull(pages: LlmsPage[], base: string, name: string, summary: string): string {
  const parts = pages.map(
    (page) =>
      `# ${page.title}\n\nURL: ${base}${page.url}\nMarkdown: ${base}${markdownPath(page.url)}\n${page.description ? `\n> ${page.description}\n` : ""}\n${absolutizeLinks(page.body, base).trim()}\n`,
  )
  return `# ${name} docs\n\n> ${summary}\n\n${parts.join("\n---\n\n")}`
}
