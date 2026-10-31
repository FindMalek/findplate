export interface BrandColors {
  background: string
  foreground: string
  muted: string
  border: string
  surface: string
  primary: string
  primaryForeground: string
}

/** The look of every email. `findplate create` fills the colors, radius and fonts from the preset. */
export const BRAND = {
  name: "acme",
  radius: 0,
  fontSans: "'IBM Plex Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  light: {
    background: "#ffffff",
    foreground: "#0a0a0a",
    muted: "#737373",
    border: "#e5e5e5",
    surface: "#f5f5f5",
    primary: "#171717",
    primaryForeground: "#fafafa",
  } satisfies BrandColors,
  dark: {
    background: "#0a0a0a",
    foreground: "#fafafa",
    muted: "#a3a3a3",
    border: "#262626",
    surface: "#171717",
    primary: "#e5e5e5",
    primaryForeground: "#171717",
  } satisfies BrandColors,
}

export type Brand = typeof BRAND
