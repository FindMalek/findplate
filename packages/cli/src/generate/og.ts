export interface OgColors {
  background: string
  foreground: string
  muted: string
  border: string
  accent: string
}

export type Rgb = [number, number, number]

function oklchToRgb(l: number, c: number, hueDeg: number): Rgb {
  const h = (hueDeg * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ]
  return linear.map((v) => {
    const clamped = Math.min(1, Math.max(0, v))
    const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055
    return Math.round(encoded * 255)
  }) as Rgb
}

const hex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`

/** `oklch(L C H / A%)` to hex, blending a translucent color onto `over`. */
export function oklchToHex(value: string, over: Rgb = [0, 0, 0]): string {
  const match = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)/)
  if (!match) throw new Error(`not an oklch color: ${value}`)
  const rgb = oklchToRgb(Number(match[1]), Number(match[2]), Number(match[3]))
  if (!match[4]) return hex(rgb)
  const alpha = match[5] ? Number(match[4]) / 100 : Number(match[4])
  return hex(rgb.map((v, i) => Math.round(v * alpha + over[i]! * (1 - alpha))) as Rgb)
}

export function block(css: string, mode: "light" | "dark"): string {
  const start = css.indexOf(mode === "dark" ? ".dark {" : ":root {")
  if (start < 0) throw new Error(`theme has no ${mode} block`)
  return css.slice(start, css.indexOf("}", start))
}

/** The preset's own tokens for the og card, from the theme's light or dark block. */
export function ogColors(themeCss: string, mode: "light" | "dark"): OgColors {
  const tokens = block(themeCss, mode)
  const read = (name: string) => {
    const found = tokens.match(new RegExp(`--${name}:\\s*(oklch\\([^)]*\\))`))
    if (!found) throw new Error(`theme has no --${name}`)
    return found[1]!
  }
  const background = oklchToHex(read("background"))
  const bg = [1, 3, 5].map((i) => Number.parseInt(background.slice(i, i + 2), 16)) as Rgb
  return {
    background,
    foreground: oklchToHex(read("foreground")),
    muted: oklchToHex(read("muted-foreground")),
    border: oklchToHex(read("border"), bg),
    accent: oklchToHex(read("primary")),
  }
}

/** The `og: { … },` entry that lib/site.ts carries, laid out the way biome keeps it. */
export const ogEntry = (colors: OgColors) =>
  `og: {\n${Object.entries(colors)
    .map(([key, value]) => `    ${key}: "${value}",`)
    .join("\n")}\n  },`
