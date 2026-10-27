import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { presetsDir } from "./paths"

export interface FontSpec {
  family: string
  weight?: string[]
}

export interface Preset {
  id: string
  label: string
  description: string
  shadcn: { style: string; baseColor: string }
  fonts: { sans: FontSpec; mono: FontSpec; heading: FontSpec }
  /** Light or dark first on the landing page. */
  defaultTheme?: "light" | "dark" | "system"
}

export function listPresets(dir = presetsDir()): Preset[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ id: entry.name, ...JSON.parse(readFileSync(join(dir, entry.name, "preset.json"), "utf8")) }))
    .sort((a, b) => (a.id === "monochrome" ? -1 : b.id === "monochrome" ? 1 : a.id.localeCompare(b.id)))
}

export const presetTheme = (id: string, dir = presetsDir()) => readFileSync(join(dir, id, "theme.css"), "utf8")
