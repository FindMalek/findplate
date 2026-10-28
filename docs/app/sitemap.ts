import type { MetadataRoute } from "next"
import { markdownPath } from "@/lib/llms"
import { SITE } from "@/lib/site"
import { source } from "@/lib/source"

export const dynamic = "force-static"

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages().flatMap((page) => [page.url, markdownPath(page.url)])
  return ["", ...pages, "/llms.txt", "/llms-full.txt", "/docs.json"].map((path) => ({ url: `${SITE.url}${path}` }))
}
