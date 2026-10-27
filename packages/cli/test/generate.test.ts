import { describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { generate } from "../src/generate"
import { buildEnv } from "../src/generate/env"
import { renameProject, toNames } from "../src/generate/rename"
import { stripModules } from "../src/generate/strip"
import { templateDir } from "../src/paths"
import { listPresets } from "../src/presets"

test("module blocks stay when enabled and disappear when not, markers always go", () => {
  const source = ["a", "// @findplate:ai", "b", "// @end", "{/* @findplate:storage */}", "c", "{/* @end */}", "d"].join(
    "\n",
  )
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

test("env keeps example defaults and fills the values it's given", () => {
  expect(buildEnv("# c\nA=1\nB=\n", { B: "x" })).toBe("# c\nA=1\nB=x\n")
})

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === "node_modules" ? [] : files(join(dir, e.name))) : [join(dir, e.name)],
  )

describe("generate", () => {
  const preset = listPresets().find((p) => p.id === "monochrome")!
  const make = (modules: string[]) => {
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
    const { target } = make(["storage", "ai"])
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
})
