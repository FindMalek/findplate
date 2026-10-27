import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

function findRoot(): string {
  let dir = process.cwd()
  while (!existsSync(/* turbopackIgnore: true */ join(dir, "template/findplate.json"))) {
    const parent = join(dir, "..")
    if (parent === dir) throw new Error("template/findplate.json not found above the docs folder")
    dir = parent
  }
  return dir
}

const ROOT = findRoot()

/** Module ids whose docs page has another name. */
const DOC_SLUGS: Record<string, string> = { docs: "docs-module", "rate-limit": "rate-limiting" }

const TOKENS = [
  "background",
  "foreground",
  "card",
  "primary",
  "primary-foreground",
  "secondary",
  "muted-foreground",
  "accent",
  "border",
  "radius",
] as const

export interface ModuleCell {
  id: string
  label: string
  hint: string
  isDefault: boolean
  href: string
}

export interface PresetInfo {
  id: string
  label: string
  description: string
  fonts: { sans: string; mono: string; heading?: string }
  radius: string
  light: Record<string, string>
  dark: Record<string, string>
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(/* turbopackIgnore: true */ join(/* turbopackIgnore: true */ ROOT, path), "utf8")) as T
}

export function getModules(): ModuleCell[] {
  const manifest = readJson<{ modules: Record<string, { label: string; hint: string; default: boolean }> }>(
    "template/findplate.json",
  )
  return Object.entries(manifest.modules).map(([id, m]) => {
    const slug = DOC_SLUGS[id] ?? id
    const exists = existsSync(/* turbopackIgnore: true */ join(process.cwd(), "content/docs", `${slug}.mdx`))
    return {
      id,
      label: m.label,
      hint: m.hint,
      isDefault: m.default,
      href: exists ? `/docs/${slug}` : "/docs/modules",
    }
  })
}

function readTokens(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const name of TOKENS) {
    const match = block.match(new RegExp(`--${name}:\\s*([^;]+);`))
    if (match?.[1]) out[name] = match[1].trim()
  }
  return out
}

const family = (f?: { family: string }) => f?.family.replaceAll("_", " ")

export function getPresets(): PresetInfo[] {
  const dir = join(ROOT, "presets")
  const first = "monochrome"
  const ids = readdirSync(/* turbopackIgnore: true */ dir).sort((a, b) =>
    a === first ? -1 : b === first ? 1 : a.localeCompare(b),
  )
  return ids.map((id) => {
    const meta = readJson<{
      label: string
      description: string
      fonts: { sans: { family: string }; mono: { family: string }; heading?: { family: string } }
    }>(`presets/${id}/preset.json`)
    const css = readFileSync(/* turbopackIgnore: true */ join(dir, id, "theme.css"), "utf8")
    const [light = "", dark = ""] = css.split(/\.dark\s*\{/)
    const lightTokens = readTokens(light)
    return {
      id,
      label: meta.label,
      description: meta.description,
      fonts: {
        sans: family(meta.fonts.sans) ?? "",
        mono: family(meta.fonts.mono) ?? "",
        heading: family(meta.fonts.heading),
      },
      radius: lightTokens.radius ?? "0",
      light: lightTokens,
      dark: { ...lightTokens, ...readTokens(dark) },
    }
  })
}

export function getSkillCount(): number {
  return readdirSync(/* turbopackIgnore: true */ join(ROOT, "template/.ruler/skills")).length
}
