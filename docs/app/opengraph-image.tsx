import { ImageResponse } from "next/og"
import { OG_SIZE, OgCard } from "@/components/og-card"
import { getModules, getPresets } from "@/lib/landing"
import { SITE } from "@/lib/site"

export const alt = SITE.name
export const size = OG_SIZE
export const contentType = "image/png"

export default function OpengraphImage() {
  const stats = [`${getModules().length} modules`, `${getPresets().length} presets`, "MIT"]
  return new ImageResponse(
    <OgCard
      name={SITE.name}
      title={SITE.name}
      description={SITE.pitch}
      command="bunx findplate create"
      stats={stats}
      colors={SITE.og}
    />,
    size,
  )
}
