import type { MetadataRoute } from "next"
import { source } from "@/lib/source"

export const dynamic = "force-dynamic"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.DOCS_URL ?? "http://localhost:3003").replace(/\/$/, "")
  return [{ url: base }, ...source.getPages().map((page) => ({ url: `${base}${page.url}` }))]
}
