import { expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { loadManifest } from "../src/manifest"
import { templateDir } from "../src/paths"
import { skillPacks, skillsAddArgs } from "../src/skills"

test("module skills are only installed with their module", () => {
  const manifest = loadManifest()
  const sources = (modules: string[]) => skillPacks(manifest, modules).map((pack) => pack.source)
  expect(sources([])).not.toContain("vercel/ai")
  expect(sources(["ai"])).toContain("vercel/ai")
  expect(sources([])).toContain("shadcn/ui")
})

test("the skills cli is pinned and told which skills and agents", () => {
  const args = skillsAddArgs({ source: "shadcn/ui", skills: ["shadcn"] })
  expect(args.slice(0, 4)).toEqual(["--yes", "skills@1.7.4", "add", "shadcn/ui"])
  expect(args).toContain("--copy")
})

test("every project skill has a SKILL.md", () => {
  for (const name of [
    "dive-ticket",
    "plan-ticket",
    "ship",
    "review-ticket",
    "triage-reviews",
    "check-touched",
    "clean-pr",
  ])
    expect(existsSync(join(templateDir(), ".ruler/skills", name, "SKILL.md"))).toBe(true)
})
