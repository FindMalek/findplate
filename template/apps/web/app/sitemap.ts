import { alternateUrls, LOCALES, localizedPath } from "@acme/i18n" // @findplate:i18n
import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/seo"

export const dynamic = "force-dynamic"

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/"]
  paths.push("/roadmap") // @findplate:roadmap
  paths.push("/status") // @findplate:status
  paths.push(...LOCALES.slice(1).flatMap((locale) => paths.map((path) => localizedPath(locale, path)))) // @findplate:i18n
  return paths.map((path) => ({
    url: `${siteUrl()}${path === "/" ? "" : path}`,
    alternates: { languages: alternateUrls(siteUrl(), path) }, // @findplate:i18n
  }))
}
