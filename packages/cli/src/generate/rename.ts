export interface Names {
  /** npm-safe slug: "my-app". */
  slug: string
  /** "My App". */
  title: string
  /** Postgres-safe identifier: "my_app". */
  db: string
}

export function toNames(input: string): Names {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const title = slug
    .split("-")
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ")
  return { slug, title, db: slug.replaceAll("-", "_") }
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)
}

const DB_FILES = /(^|\/)(docker-compose\.ya?ml|\.env(\.example)?)$/

/** Rewrites the template's "acme" into the project's names: scope, package names, titles, db identifiers. */
export function renameProject(source: string, file: string, names: Names): string {
  let out = source.replaceAll("@acme/", `@${names.slug}/`)
  if (DB_FILES.test(file)) out = out.replace(/\bacme\b/g, names.db)
  return out.replace(/\bAcme\b/g, names.title).replace(/\bacme\b/g, names.slug)
}
