import type { FontSpec, Preset } from "../presets"

function call(name: string, spec: FontSpec, variable: string): string {
  const weight = spec.weight ? `, weight: ${JSON.stringify(spec.weight)}` : ""
  return `const ${name} = ${spec.family}({ subsets: ["latin"]${weight}, variable: "${variable}" })`
}

/** apps/<app>/app/fonts.ts for a preset: next/font/google imports for sans, mono and heading. */
export function fontsModule(preset: Preset): string {
  const families = [
    ...new Set([preset.fonts.sans.family, preset.fonts.mono.family, preset.fonts.heading.family]),
  ].sort()
  return [
    `// Written by the design preset (${preset.id}). Variables: --font-sans, --font-mono, --font-heading.`,
    `import { ${families.join(", ")} } from "next/font/google"`,
    "",
    call("sans", preset.fonts.sans, "--font-sans"),
    call("mono", preset.fonts.mono, "--font-mono"),
    call("heading", preset.fonts.heading, "--font-heading"),
    "",
    'export const fontVariables = [sans.variable, mono.variable, heading.variable].join(" ")',
    "",
  ].join("\n")
}
