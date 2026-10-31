import { expect, test } from "bun:test"
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { diffProject } from "../src/commands/diff"
import { renderer, update } from "../src/commands/update"
import { templateDir } from "../src/paths"
import { saveState } from "../src/state"

const answers = {
  name: "demo",
  pitch: "A pitch",
  preset: "monochrome",
  modules: [],
  postgresPort: 5432,
  adminEmail: "",
}
const state = { version: 1 as const, cliVersion: "0.0.1", answers, done: [] }

function project() {
  const root = mkdtempSync(join(tmpdir(), "fp-diff-"))
  const old = join(root, "old-template")
  cpSync(templateDir(), old, { recursive: true, filter: (src) => !src.includes("node_modules") })
  writeFileSync(join(old, "README.md"), `${readFileSync(join(old, "README.md"), "utf8")}\nstale line\n`)
  const target = join(root, "demo")
  renderer(state)(old, target)
  saveState(target, state)
  return { root, old, target }
}

test("diff lists a modified file and update --dry-run shows changes without writing", async () => {
  const { root, old, target } = project()
  const site = join(target, "apps/web/lib/site.ts")
  writeFileSync(site, `${readFileSync(site, "utf8")}\n// mine\n`)

  const base = join(root, "base")
  renderer(state)(old, base)
  const changes = diffProject(base, target)
  expect(changes.map((c) => [c.file, c.status])).toEqual([["apps/web/lib/site.ts", "modified"]])
  expect(changes[0]?.diff).toContain("+// mine")

  const readme = join(target, "README.md")
  const before = readFileSync(readme, "utf8")
  const logs: string[] = []
  const info = console.info
  console.info = (...args: unknown[]) => void logs.push(args.join(" "))
  try {
    await update({ dir: target, force: true, dryRun: true, baseTemplate: old, version: "0.2.0" })
  } finally {
    console.info = info
  }
  expect(logs.join("\n")).toContain("-stale line")
  expect(readFileSync(readme, "utf8")).toBe(before)
})
