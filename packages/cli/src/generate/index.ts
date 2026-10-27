import { randomBytes } from "node:crypto"
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { basename, join, relative } from "node:path"
import { loadManifest } from "../manifest"
import { type Preset, presetTheme } from "../presets"
import { buildEnv } from "./env"
import { fontsModule } from "./fonts"
import { type Names, renameProject } from "./rename"
import { stripModules } from "./strip"

export interface GenerateOptions {
  templateDir: string
  target: string
  names: Names
  pitch: string
  preset: Preset
  modules: ReadonlySet<string>
  /** Values for .env, on top of generated secrets (provider keys and such). */
  env: Record<string, string>
  postgresPort: number
}

const SKIP = new Set(["node_modules", ".next", ".turbo", ".env", "findplate.json", "dist", ".findplate"])
const TEXT =
  /\.(ts|tsx|js|mjs|cjs|json|jsonc|md|mdx|css|ya?ml|toml|sql|txt|svg)$|(^|\/)(Dockerfile|\.env\.example|\.gitignore|\.dockerignore)$/

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

function removeDependencies(pkg: Record<string, unknown>, names: ReadonlySet<string>) {
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = pkg[field] as Record<string, string> | undefined
    if (!deps) continue
    for (const name of Object.keys(deps)) if (names.has(name)) delete deps[name]
  }
}

function setComponentsStyle(file: string, preset: Preset) {
  if (!existsSync(file)) return
  const config = JSON.parse(readFileSync(file, "utf8"))
  config.style = preset.shadcn.style
  config.tailwind.baseColor = preset.shadcn.baseColor
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`)
}

/** Copies the template into `target` and turns it into the project: modules, names, preset, env. */
export function generate(opts: GenerateOptions) {
  const manifest = loadManifest(opts.templateDir)
  const { target, names } = opts
  cpSync(opts.templateDir, target, {
    recursive: true,
    filter: (src) => !SKIP.has(basename(src)) && !src.endsWith(".tsbuildinfo") && !src.endsWith("next-env.d.ts"),
  })

  const disabled = Object.entries(manifest.modules).filter(([id]) => !opts.modules.has(id))
  for (const [, spec] of disabled)
    for (const path of spec.paths) rmSync(join(target, path), { recursive: true, force: true })
  const kept = new Set(
    Object.entries(manifest.modules).flatMap(([id, spec]) => (opts.modules.has(id) ? spec.packages : [])),
  )
  const dropped = new Set(disabled.flatMap(([, spec]) => spec.packages).filter((name) => !kept.has(name)))

  for (const file of walk(target)) {
    const rel = relative(target, file)
    if (!TEXT.test(rel) || statSync(file).size > 2_000_000) continue
    const source = readFileSync(file, "utf8")
    let out = stripModules(source, opts.modules)
    if (rel.endsWith("package.json")) {
      const pkg = JSON.parse(out)
      removeDependencies(pkg, dropped)
      if (rel === "package.json") {
        pkg.name = names.slug
        for (const [id, spec] of Object.entries(manifest.modules))
          if (opts.modules.has(id)) Object.assign(pkg.scripts, spec.scripts)
      }
      out = `${JSON.stringify(pkg, null, 2)}\n`
    }
    if (rel === "pnpm-workspace.yaml") {
      out = out
        .split("\n")
        .filter(
          (line) => !/^\s+"?([@\w/.-]+)"?:/.test(line) || !dropped.has(line.trim().split(":")[0]!.replaceAll('"', "")),
        )
        .join("\n")
    }
    out = renameProject(out, rel, names)
    if (out !== source) writeFileSync(file, out)
  }

  writeFileSync(join(target, "packages/ui/src/styles/theme.css"), presetTheme(opts.preset.id))
  for (const app of ["web", "dashboard"])
    writeFileSync(join(target, `apps/${app}/app/fonts.ts`), fontsModule(opts.preset))
  for (const file of ["packages/ui/components.json", "apps/web/components.json", "apps/dashboard/components.json"]) {
    setComponentsStyle(join(target, file), opts.preset)
  }
  if (opts.preset.defaultTheme) {
    const provider = join(target, "apps/web/components/theme-provider.tsx")
    const source = readFileSync(provider, "utf8")
    if (!source.includes('defaultTheme="dark"')) throw new Error("theme-provider.tsx has no defaultTheme to set")
    writeFileSync(provider, source.replace('defaultTheme="dark"', `defaultTheme="${opts.preset.defaultTheme}"`))
  }
  const site = join(target, "apps/web/lib/site.ts")
  writeFileSync(site, readFileSync(site, "utf8").replace(/tagline: ".*",/, `tagline: ${JSON.stringify(opts.pitch)},`))

  const adminPassword = randomBytes(12).toString("base64url")
  const example = readFileSync(join(target, ".env.example"), "utf8")
  writeFileSync(
    join(target, ".env"),
    buildEnv(example, {
      POSTGRES_PORT: String(opts.postgresPort),
      DATABASE_URL: `postgres://${names.db}:${names.db}@localhost:${opts.postgresPort}/${names.db}`,
      BETTER_AUTH_SECRET: randomBytes(32).toString("base64"),
      ADMIN_PASSWORD: adminPassword,
      ...opts.env,
    }),
  )
  return { adminEmail: `admin@${names.slug}.local`, adminPassword }
}
