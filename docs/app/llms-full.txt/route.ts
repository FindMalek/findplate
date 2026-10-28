import { getLlmsGroups } from "@/lib/docs-llms"
import { renderLlmsFull } from "@/lib/llms"
import { SITE } from "@/lib/site"

export const revalidate = false

export async function GET() {
  const pages = (await getLlmsGroups()).flatMap((group) => group.pages)
  return new Response(renderLlmsFull(pages, SITE.url, SITE.name, SITE.pitch), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
