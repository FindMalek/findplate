import { alternateUrls, LOCALES, localizedPath } from "@acme/i18n" // @findplate:i18n
import type { MetadataRoute } from "next"
import { getPosts } from "@/lib/blog" // @findplate:blog
import { siteUrl } from "@/lib/seo"

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ["/"]
  paths.push("/roadmap") // @findplate:roadmap
  paths.push("/privacy", "/terms") // @findplate:compliance
  paths.push("/status") // @findplate:status
  // @findplate:blog
  paths.push("/blog", "/changelog")
  paths.push(...(await getPosts()).map((post) => `/blog/${post.slug}`))
  // @end
  paths.push(...LOCALES.slice(1).flatMap((locale) => paths.map((path) => localizedPath(locale, path)))) // @findplate:i18n
  return paths.map((path) => ({
    url: `${siteUrl()}${path === "/" ? "" : path}`,
    alternates: { languages: alternateUrls(siteUrl(), path) }, // @findplate:i18n
  }))
}
