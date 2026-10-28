import { notFound } from "next/navigation"
import { ImageResponse } from "next/og"
import { OG_SIZE, OgCard } from "@/components/og-card"
import { SITE } from "@/lib/site"
import { source } from "@/lib/source"

export const revalidate = false

export function generateStaticParams() {
  return source.generateParams()
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) notFound()
  return new ImageResponse(
    <OgCard
      name={SITE.name}
      title={page.data.title}
      description={page.data.description}
      stats={["docs"]}
      colors={SITE.og}
    />,
    OG_SIZE,
  )
}
