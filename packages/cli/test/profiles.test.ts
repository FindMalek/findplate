import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { create } from "../src/commands/create"
import { loadManifest, validateManifest } from "../src/manifest"
import { expandRequires, needsFor, pendingKeys, pickModules, profileModules } from "../src/profiles"
import { loadState, statePath } from "../src/state"

const manifest = loadManifest()

test("every module has a group and a hint, and every requires target exists", () => {
  const broken = structuredClone(manifest)
  broken.modules.ai!.group = "nope"
  broken.modules.ai!.requires = ["ghost"]
  expect(() => validateManifest(broken)).toThrow(/group "nope"[\s\S]*unknown module "ghost"/)
})

test("profiles pick modules and never include a self-hosted one by default", () => {
  expect(profileModules(manifest, "minimal")).toEqual([])
  expect(profileModules(manifest, "standard")).toContain("ai")
  const everything = profileModules(manifest, "everything")
  expect(everything.length).toBeGreaterThan(profileModules(manifest, "standard").length)
  expect(everything.filter((id) => manifest.modules[id]?.server)).toEqual([])
})

test("--modules wins over --profile and requires are expanded", () => {
  const picked = pickModules(manifest, { modules: "langfuse", profile: "everything" })
  expect(picked.modules).toEqual(["langfuse", "ai"])
  expect(picked.added).toEqual([{ id: "ai", by: "langfuse" }])
  expect(expandRequires(manifest, ["ai"]).added).toEqual([])
  expect(() => pickModules(manifest, { profile: "huge" })).toThrow(/Unknown profile/)
})

test("keys listing covers the chosen modules only, and skips keys already set", () => {
  const needs = needsFor(manifest, ["langfuse"])
  expect(needs.map((n) => n.server?.label ?? n.key?.env)).toEqual([
    "a self-hosted Langfuse server",
    "LANGFUSE_PUBLIC_KEY",
    "LANGFUSE_SECRET_KEY",
  ])
  const pending = pendingKeys(manifest, ["langfuse", "ai"], { LANGFUSE_PUBLIC_KEY: "pk" })
  expect(pending.map((n) => n.key?.env)).toContain("LANGFUSE_SECRET_KEY")
  expect(pending.map((n) => n.key?.env)).not.toContain("LANGFUSE_PUBLIC_KEY")
})

test("-y uses standard, --profile overrides it, and a resume keeps the answers", async () => {
  const root = mkdtempSync(join(tmpdir(), "fp-profile-"))
  const flags = { install: false, git: false, agents: false, skills: false, yes: true }

  const std = join(root, "std")
  await create({ ...flags, dir: std, name: "std" })
  expect(loadState(std)?.answers.profile).toBe("standard")
  expect(loadState(std)?.answers.modules).toEqual(profileModules(manifest, "standard"))

  const all = join(root, "all")
  await create({ ...flags, dir: all, name: "all", profile: "everything" })
  const first = loadState(all)
  expect(first?.answers.profile).toBe("everything")

  writeFileSync(statePath(all), JSON.stringify({ ...first, done: [] }))
  await create({ ...flags, dir: all, name: "all", profile: "minimal" })
  expect(loadState(all)?.answers.modules).toEqual(first?.answers.modules)
  expect(loadState(all)?.answers.profile).toBe("everything")

  const old = loadState(all)!
  const { profile: _, ...answers } = old.answers
  writeFileSync(statePath(all), JSON.stringify({ ...old, answers, done: [] }))
  await create({ ...flags, dir: all, name: "all" })
  expect(loadState(all)?.answers.modules).toEqual(first?.answers.modules)
}, 60_000)
