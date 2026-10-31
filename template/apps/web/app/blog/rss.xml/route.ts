import { getPosts, rssFeed } from "@/lib/blog"
import { siteUrl } from "@/lib/seo"

export const dynamic = "force-dynamic"

export async function GET() {
  return new Response(rssFeed(await getPosts(), siteUrl()), {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  })
}
