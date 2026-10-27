import type { MetadataRoute } from "next"
import { isIndexable, siteUrl } from "@/lib/seo"

export const dynamic = "force-dynamic"

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) return { rules: { userAgent: "*", disallow: "/" } }
  const sitemap = [`${siteUrl()}/sitemap.xml`]
  sitemap.push(`${process.env.DOCS_URL ?? "http://localhost:3003"}/sitemap.xml`) // @findplate:docs
  return { rules: { userAgent: "*", allow: "/" }, sitemap }
}
