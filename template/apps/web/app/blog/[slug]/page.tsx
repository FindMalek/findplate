import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { JsonLd } from "@/components/json-ld"
import { getPost, getPosts } from "@/lib/blog"
import { siteUrl } from "@/lib/seo"

export async function generateStaticParams() {
  return (await getPosts()).map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = await getPost((await params).slug)
  if (!post) return {}
  const { title, description, date } = post.meta
  return { title, description, openGraph: { title, description, type: "article", publishedTime: date } }
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()
  const { Content, meta } = post
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: meta.title,
          description: meta.description,
          datePublished: meta.date,
          url: `${siteUrl()}/blog/${slug}`,
          publisher: { "@id": `${siteUrl()}/#organization` },
        }}
      />
      <time dateTime={meta.date} className="font-mono text-muted-foreground text-xs">
        {meta.date}
      </time>
      <h1 className="mt-2 font-heading font-semibold text-4xl tracking-tight">{meta.title}</h1>
      <Content />
    </main>
  )
}
