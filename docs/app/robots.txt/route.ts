import { SITE } from "@/lib/site"

export const revalidate = false

const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
]

export function GET() {
  const body = [
    "# The docs are public on purpose: AI crawlers and agents are welcome.",
    "# Start at /llms.txt, every page is also served as markdown at <page-url>.md",
    ...AI_CRAWLERS.flatMap((agent) => ["", `User-agent: ${agent}`, "Allow: /"]),
    "",
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE.url}/sitemap.xml`,
    "",
  ].join("\n")
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
}
