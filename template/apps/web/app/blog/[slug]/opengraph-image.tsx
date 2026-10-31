import { OG_SIZE, OgCard } from "@acme/ui/brand/og-card"
import { ImageResponse } from "next/og"
import { getPost } from "@/lib/blog"
import { SITE } from "@/lib/site"

export const size = OG_SIZE
export const contentType = "image/png"

export default async function PostImage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug)
  return new ImageResponse(
    <OgCard
      name={SITE.name}
      title={post?.meta.title ?? SITE.name}
      description={post?.meta.description ?? SITE.tagline}
      colors={SITE.og}
    />,
    size,
  )
}
