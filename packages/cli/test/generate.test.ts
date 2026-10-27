import { describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { generate } from "../src/generate"
import { buildEnv } from "../src/generate/env"
import { ogColors } from "../src/generate/og"
import { renameProject, toNames } from "../src/generate/rename"
import { stripModules } from "../src/generate/strip"
import { presetsDir, templateDir } from "../src/paths"
import { listPresets } from "../src/presets"

test("module blocks stay when enabled and disappear when not, markers always go", () => {
  const source = [
    "a",
    "// @findplate:ai",
    "b",
    "// @end",
    "{/* @findplate:storage */}",
    "c",
    "{/* @end */}",
    "<!-- @findplate:docs -->",
    "e",
    "<!-- @end -->",
    "d",
  ].join("\n")
  expect(stripModules(source, new Set(["ai"]))).toBe("a\nb\nd")
  expect(stripModules(source, new Set())).toBe("a\nd")
  expect(stripModules('import { a } from "a" // @findplate:ai\nb', new Set(["ai"]))).toBe('import { a } from "a"\nb')
  expect(stripModules('import { a } from "a" // @findplate:ai\nb', new Set())).toBe("b")
  expect(() => stripModules("// @findplate:ai\nx", new Set())).toThrow("never closed")
})

test("names: scope, titles, and postgres-safe identifiers only in db files", () => {
  const names = toNames("My Cool App")
  expect(names).toEqual({ slug: "my-cool-app", title: "My Cool App", db: "my_cool_app" })
  expect(renameProject('import "@acme/ui"; // Acme acme', "a.ts", names)).toBe(
    'import "@my-cool-app/ui"; // My Cool App my-cool-app',
  )
  expect(renameProject("POSTGRES_USER: acme", "docker/docker-compose.yml", names)).toBe("POSTGRES_USER: my_cool_app")
})

test("og colors come from the preset tokens, blending translucent borders", () => {
  const css = readFileSync(join(presetsDir(), "monochrome", "theme.css"), "utf8")
  expect(ogColors(css, "dark")).toMatchObject({ background: "#0a0a0a", foreground: "#fafafa" })
  expect(ogColors(css, "dark").border).toMatch(/^#[0-9a-f]{6}$/)
  expect(ogColors(css, "light").background).toBe("#ffffff")
})

test("env keeps example defaults and fills the values it's given", () => {
  expect(buildEnv("# c\nA=1\nB=\n", { B: "x" })).toBe("# c\nA=1\nB=x\n")
})

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === "node_modules" ? [] : files(join(dir, e.name))) : [join(dir, e.name)],
  )

describe("generate", () => {
  const make = (modules: string[], preset = listPresets().find((p) => p.id === "monochrome")!) => {
    const target = join(mkdtempSync(join(tmpdir(), "findplate-")), "demo-app")
    const result = generate({
      templateDir: templateDir(),
      target,
      names: toNames("demo-app"),
      pitch: "Demo pitch",
      preset,
      modules: new Set(modules),
      env: { GROQ_API_KEY: "gsk_test" },
      postgresPort: 5499,
    })
    return { target, result }
  }

  test("with every module: no template names or markers left, env filled", () => {
    const { target } = make([
      "storage",
      "ai",
      "whatsapp",
      "telegram",
      "docs",
      "email",
      "waitlist",
      "roadmap",
      "status",
      "umami",
      "openobserve",
      "glitchtip",
      "infisical",
      "langfuse",
      "databuddy",
    ])
    for (const file of files(target)) {
      if (statSync(file).size > 2_000_000 || /\.(ico|png)$/.test(file)) continue
      const text = readFileSync(file, "utf8")
      expect({ file, acme: /\bacme\b|@acme\//i.test(text) }).toEqual({ file, acme: false })
      expect({ file, marker: text.includes("@findplate:") }).toEqual({ file, marker: false })
    }
    const env = readFileSync(join(target, ".env"), "utf8")
    expect(env).toContain("DATABASE_URL=postgres://demo_app:demo_app@localhost:5499/demo_app")
    expect(env).toMatch(/BETTER_AUTH_SECRET=.{40,}/)
    expect(env).toContain("GROQ_API_KEY=gsk_test")
    expect(readFileSync(join(target, "apps/web/lib/site.ts"), "utf8")).toContain('tagline: "Demo pitch"')
  })

  test("without modules: their packages, deps and code are gone", () => {
    const { target } = make([])
    expect(existsSync(join(target, "packages/storage"))).toBe(false)
    expect(existsSync(join(target, "packages/ai"))).toBe(false)
    const api = readFileSync(join(target, "apps/api/package.json"), "utf8")
    expect(api).not.toContain("@demo-app/ai")
    expect(api).not.toContain("@demo-app/storage")
    expect(readFileSync(join(target, "apps/api/src/index.ts"), "utf8")).not.toContain("resolveModel")
    expect(readFileSync(join(target, "pnpm-workspace.yaml"), "utf8")).not.toMatch(/ai-sdk|^\s+ai:/m)
    expect(readFileSync(join(target, ".env.example"), "utf8")).not.toContain("S3_BUCKET")
  })

  test("a module's migration leaves the drizzle journal when the module is off", () => {
    const tags = (modules: string[]) =>
      JSON.parse(
        readFileSync(join(make(modules).target, "packages/db/drizzle/meta/_journal.json"), "utf8"),
      ).entries.map((entry: { tag: string }) => entry.tag)
    expect(tags(["waitlist"])).toEqual(["0000_init", "0001_waitlist"])
    expect(tags([])).toEqual(["0000_init"])
  })

  test("docs module: only with --modules docs, with the preset fonts, pitch and env url", () => {
    const on = make(["docs"]).target
    expect(readFileSync(join(on, "apps/docs/lib/site.ts"), "utf8")).toContain('tagline: "Demo pitch"')
    expect(readFileSync(join(on, "apps/docs/app/fonts.ts"), "utf8")).toContain("IBM_Plex_Sans")
    expect(readFileSync(join(on, ".env.example"), "utf8")).toContain("DOCS_URL=")
    const off = make([]).target
    expect(existsSync(join(off, "apps/docs"))).toBe(false)
    expect(readFileSync(join(off, "pnpm-workspace.yaml"), "utf8")).not.toContain("fumadocs")
    expect(readFileSync(join(off, ".env.example"), "utf8")).not.toContain("DOCS_URL")
  })

  test("a package shared by two modules stays while one is on; module scripts land in the root", () => {
    const { target } = make(["openobserve", "infisical"])
    const api = readFileSync(join(target, "apps/api/package.json"), "utf8")
    expect(api).toContain("@opentelemetry/sdk-node")
    expect(api).not.toContain("@langfuse/otel")
    expect(JSON.parse(readFileSync(join(target, "package.json"), "utf8")).scripts["dev:secrets"]).toContain("infisical")
  })

  test.each(listPresets().map((p) => p.id))("preset %s: tokens, fonts and theme land, nothing left over", (id) => {
    const preset = listPresets().find((p) => p.id === id)!
    const { target } = make([], preset)
    const theme = readFileSync(join(target, "packages/ui/src/styles/theme.css"), "utf8")
    expect(theme).toBe(readFileSync(join(presetsDir(), id, "theme.css"), "utf8"))
    expect(readFileSync(join(target, "apps/web/app/fonts.ts"), "utf8")).toContain(`${preset.fonts.heading.family}(`)
    expect(JSON.parse(readFileSync(join(target, "apps/web/components.json"), "utf8")).style).toBe(preset.shadcn.style)
    for (const file of files(target)) {
      if (statSync(file).size > 2_000_000 || /\.(ico|png)$/.test(file)) continue
      const text = readFileSync(file, "utf8")
      expect({ file, left: /\bacme\b|@acme\/|@findplate:/i.test(text) }).toEqual({ file, left: false })
    }
  })
})
