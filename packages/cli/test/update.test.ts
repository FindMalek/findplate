import { expect, test } from "bun:test"
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { update } from "../src/commands/update"
import { generate } from "../src/generate"
import { toNames } from "../src/generate/rename"
import { templateDir } from "../src/paths"
import { listPresets } from "../src/presets"
import { loadState, saveState } from "../src/state"

test("update applies the template diff and leaves the user's own edits alone", async () => {
  const root = mkdtempSync(join(tmpdir(), "fp-update-"))
  const old = join(root, "old-template")
  cpSync(templateDir(), old, { recursive: true, filter: (src) => !src.includes("node_modules") })
  writeFileSync(join(old, "README.md"), `${readFileSync(join(old, "README.md"), "utf8")}\nstale line\n`)

  const target = join(root, "demo")
  const answers = {
    name: "demo",
    pitch: "A pitch",
    preset: "monochrome",
    modules: [],
    postgresPort: 5432,
    adminEmail: "",
  }
  const preset = listPresets().find((candidate) => candidate.id === answers.preset)
  if (!preset) throw new Error("no monochrome preset")
  generate({
    templateDir: old,
    target,
    names: toNames("demo"),
    pitch: answers.pitch,
    preset,
    modules: new Set(),
    env: {},
    postgresPort: 5432,
  })
  saveState(target, { version: 1, cliVersion: "0.0.1", answers, done: [] })
  const site = join(target, "apps/web/lib/site.ts")
  writeFileSync(site, `${readFileSync(site, "utf8")}\n// mine\n`)

  await update({ dir: target, force: true, dryRun: false, baseTemplate: old, version: "0.2.0" })

  expect(readFileSync(join(target, "README.md"), "utf8")).not.toContain("stale line")
  expect(readFileSync(site, "utf8")).toContain("// mine")
  expect(loadState(target)?.cliVersion).toBe("0.2.0")
})
