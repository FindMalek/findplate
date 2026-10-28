export const SITE = {
  name: "findplate",
  pitch: "A production-ready full-stack project, generated in one command.",
  /** Public origin, no trailing slash. Set DOCS_URL on preview deploys. */
  url: (process.env.DOCS_URL ?? "https://plate.findmalek.engineer").replace(/\/$/, ""),
  github: "https://github.com/FindMalek/findplate",
  shadcnCreate: "https://ui.shadcn.com/create",
  /** Colors of the social card (opengraph-image). Any hex works. */
  og: {
    background: "#0a0a0a",
    foreground: "#fafafa",
    muted: "#a3a3a3",
    border: "#262626",
    accent: "#e5e5e5",
  },
}
