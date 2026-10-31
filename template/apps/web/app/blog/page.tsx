import type { Metadata } from "next"
import Link from "next/link"
import { getPosts } from "@/lib/blog"
import { SITE } from "@/lib/site"

export const metadata: Metadata = {
  title: "Blog",
  description: `News and notes from ${SITE.name}.`,
  alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
}

export default async function BlogPage() {
  const posts = await getPosts()
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="font-heading font-semibold text-3xl tracking-tight">Blog</h1>
      {posts.length === 0 && <p className="text-muted-foreground">No posts yet.</p>}
      {posts.map((post) => (
        <article key={post.slug} className="flex flex-col gap-1 border-b pb-6">
          <time dateTime={post.date} className="font-mono text-muted-foreground text-xs">
            {post.date}
          </time>
          <Link href={`/blog/${post.slug}`} className="font-heading font-medium text-xl hover:underline">
            {post.title}
          </Link>
          <p className="text-muted-foreground">{post.description}</p>
        </article>
      ))}
    </main>
  )
}
