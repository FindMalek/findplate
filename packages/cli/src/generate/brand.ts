import type { FontSpec } from "../presets"
import { block, oklchToHex, type Rgb } from "./og"

export interface EmailColors {
  background: string
  foreground: string
  muted: string
  border: string
  surface: string
  primary: string
  primaryForeground: string
}

const toRgb = (color: string) => [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16)) as Rgb

/** The preset's tokens as the hex colors an email can carry, for one theme mode. */
export function emailColors(themeCss: string, mode: "light" | "dark"): EmailColors {
  const tokens = block(themeCss, mode)
  const read = (name: string) => {
    const found = tokens.match(new RegExp(`--${name}:\\s*(oklch\\([^)]*\\))`))
    if (!found) throw new Error(`theme has no --${name}`)
    return found[1]!
  }
  const background = oklchToHex(read("background"))
  const over = toRgb(background)
  return {
    background,
    foreground: oklchToHex(read("foreground")),
    muted: oklchToHex(read("muted-foreground")),
    border: oklchToHex(read("border"), over),
    surface: oklchToHex(read("secondary"), over),
    primary: oklchToHex(read("primary"), over),
    primaryForeground: oklchToHex(read("primary-foreground"), over),
  }
}

/** `--radius` in px; presets write it in rem or as a bare 0. */
export function radiusPx(themeCss: string): number {
  const found = block(themeCss, "light").match(/--radius:\s*([\d.]+)(rem|px)?/)
  if (!found) return 0
  return Math.round(Number(found[1]) * (found[2] === "rem" ? 16 : 1))
}

const SANS_FALLBACK = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
const MONO_FALLBACK = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
const stack = (font: FontSpec, fallback: string) => `'${font.family.replaceAll("_", " ")}', ${fallback}`

const colorsEntry = (key: string, colors: EmailColors) =>
  `${key}: {\n${Object.entries(colors)
    .map(([name, value]) => `    ${name}: "${value}",`)
    .join("\n")}\n  } satisfies BrandColors,`

/** Rewrites the preset-driven fields of `packages/notification/src/brand.ts`. */
export function brandSource(source: string, theme: { css: string; sans: FontSpec; mono: FontSpec }): string {
  let out = source
  const swap = (pattern: RegExp, value: string) => {
    if (!pattern.test(out)) throw new Error(`brand.ts has no ${pattern}`)
    out = out.replace(pattern, () => value)
  }
  swap(/radius: \d+,/, `radius: ${radiusPx(theme.css)},`)
  swap(/fontSans: ".*",/, `fontSans: ${JSON.stringify(stack(theme.sans, SANS_FALLBACK))},`)
  swap(/fontMono: ".*",/, `fontMono: ${JSON.stringify(stack(theme.mono, MONO_FALLBACK))},`)
  swap(/light: \{[^}]*\} satisfies BrandColors,/, colorsEntry("light", emailColors(theme.css, "light")))
  swap(/dark: \{[^}]*\} satisfies BrandColors,/, colorsEntry("dark", emailColors(theme.css, "dark")))
  return out
}
