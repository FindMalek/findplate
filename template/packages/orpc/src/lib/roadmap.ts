export interface Milestone {
  title: string
  description: string
  url: string
  state: "open" | "closed"
  open: number
  closed: number
  progress: number
  dueOn: string | null
}

interface RawMilestone {
  title: string
  description: string | null
  html_url: string
  state: "open" | "closed"
  open_issues: number
  closed_issues: number
  due_on: string | null
}

/** Milestones in the order they ship: dated first, soonest first, undated ones last. */
export function toRoadmap(raw: RawMilestone[]): Milestone[] {
  return raw
    .map((m) => {
      const total = m.open_issues + m.closed_issues
      return {
        title: m.title,
        description: m.description ?? "",
        url: m.html_url,
        state: m.state,
        open: m.open_issues,
        closed: m.closed_issues,
        progress: total === 0 ? 0 : Math.round((m.closed_issues / total) * 100),
        dueOn: m.due_on,
      }
    })
    .sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999") || a.title.localeCompare(b.title))
}

const TTL = 10 * 60_000
let cache: { at: number; repo: string; value: Milestone[] } | null = null

/** The repo's milestones, cached so GitHub's rate limit never matters. */
export async function fetchRoadmap(repo: string | undefined, token?: string): Promise<Milestone[]> {
  if (!repo) return []
  if (cache && cache.repo === repo && Date.now() - cache.at < TTL) return cache.value
  const res = await fetch(`https://api.github.com/repos/${repo}/milestones?state=all&per_page=50`, {
    headers: { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
  }).catch(() => null)
  const value = res?.ok ? toRoadmap((await res.json()) as RawMilestone[]) : (cache?.value ?? [])
  cache = { at: Date.now(), repo, value }
  return value
}
