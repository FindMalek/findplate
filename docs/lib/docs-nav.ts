import { source } from "@/lib/source"

export interface NavItem {
  name: string
  url: string
}

export interface NavGroup {
  name: string
  items: NavItem[]
}

/** Sidebar groups come from the `---Label---` separators in content/docs/meta.json. */
export function getNavGroups(): NavGroup[] {
  const groups: NavGroup[] = []
  for (const node of source.getPageTree().children) {
    if (node.type === "separator") {
      groups.push({ name: String(node.name ?? ""), items: [] })
    } else if (node.type === "page") {
      if (groups.length === 0) groups.push({ name: "Start", items: [] })
      groups[groups.length - 1]?.items.push({ name: String(node.name), url: node.url })
    }
  }
  return groups
}

export function getNavNeighbours(url: string): { group?: string; prev?: NavItem; next?: NavItem } {
  const groups = getNavGroups()
  const flat = groups.flatMap((g) => g.items)
  const i = flat.findIndex((item) => item.url === url)
  const group = groups.find((g) => g.items.some((item) => item.url === url))?.name
  return { group, prev: i > 0 ? flat[i - 1] : undefined, next: i >= 0 ? flat[i + 1] : undefined }
}
