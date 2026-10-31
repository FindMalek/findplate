import { readdir } from "node:fs/promises"
import { join } from "node:path"
import type { ComponentType } from "react"
import { SITE } from "./site"

export interface PostMeta {
  slug: string
  title: string
  description: string
  /** ISO date, `2026-01-31`. */
  date: string
}

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** Newest first. */
export const sortPosts = (posts: PostMeta[]): PostMeta[] => [...posts].sort((a, b) => b.date.localeCompare(a.date))

export function rssFeed(posts: PostMeta[], origin: string): string {
  const items = sortPosts(posts)
    .map(
      (post) => `<item>
<title>${escapeXml(post.title)}</title>
<link>${origin}/blog/${post.slug}</link>
<guid>${origin}/blog/${post.slug}</guid>
<pubDate>${new Date(post.date).toUTCString()}</pubDate>
<description>${escapeXml(post.description)}</description>
</item>`,
    )
    .join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>${escapeXml(SITE.name)} blog</title>
<link>${origin}/blog</link>
<description>${escapeXml(SITE.tagline)}</description>
${items}
</channel>
</rss>`
}

async function loadPost(slug: string): Promise<{ Content: ComponentType; meta: PostMeta } | null> {
  const mod = await import(`../content/blog/${slug}.mdx`).catch(() => null)
  if (!mod?.meta) return null
  return { Content: mod.default, meta: { ...mod.meta, slug } }
}

export const getPost = (slug: string) => (/^[\w-]+$/.test(slug) ? loadPost(slug) : Promise.resolve(null))

export async function getPosts(): Promise<PostMeta[]> {
  const files = await readdir(join(process.cwd(), "content/blog"))
  const slugs = files.filter((file) => file.endsWith(".mdx")).map((file) => file.slice(0, -".mdx".length))
  const posts = await Promise.all(slugs.map((slug) => loadPost(slug)))
  return sortPosts(posts.flatMap((post) => (post ? [post.meta] : [])))
}
