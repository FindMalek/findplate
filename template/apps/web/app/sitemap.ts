import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/seo"

export const dynamic = "force-dynamic"

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/"]
  paths.push("/roadmap") // @findplate:roadmap
  paths.push("/status") // @findplate:status
  return paths.map((path) => ({ url: `${siteUrl()}${path === "/" ? "" : path}` }))
}
