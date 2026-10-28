import { expect, test } from "bun:test"
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { addCommand } from "../src/commands/add"
import { create } from "../src/commands/create"
import { removeCommand } from "../src/commands/remove"
import { moduleEnvKeys, planRemoveFile, resolveRemoval } from "../src/remove-plan"
import { loadState } from "../src/state"

const buf = (text?: string) => (text === undefined ? undefined : Buffer.from(text))

test("planRemoveFile deletes untouched module files and keeps edited ones", () => {
  expect(planRemoveFile({ base: buf("a"), next: undefined, ours: buf("a") })).toBe("delete")
  expect(planRemoveFile({ base: buf("a"), next: undefined, ours: buf("mine") })).toBe("edited")
  expect(planRemoveFile({ base: buf("a"), next: undefined, ours: undefined })).toBe("keep")
})

test("planRemoveFile strips shared files only where unmodified", () => {
  expect(planRemoveFile({ base: buf("a\nb\n"), next: buf("a\n"), ours: buf("a\nb\n") })).toBe("update")
  expect(planRemoveFile({ base: buf("a\nb\n"), next: buf("a\n"), ours: buf("x\na\nb\n") })).toBe("merge")
  expect(planRemoveFile({ base: buf("a\nb\n"), next: buf("a\n"), ours: buf("a\n") })).toBe("keep")
})

test("resolveRemoval refuses when an enabled module requires it", () => {
  const manifest = {
    name: "",
    scope: "",
    skills: [],
    modules: {
      a: { label: "", hint: "", default: false, paths: [], packages: [], requires: ["b"] },
      b: { label: "", hint: "", default: false, paths: [], packages: [] },
    },
  }
  expect(() => resolveRemoval(manifest, ["a", "b"], ["b"])).toThrow("a requires b")
  expect(resolveRemoval(manifest, ["a", "b"], ["a", "b"])).toEqual(["a", "b"])
  expect(resolveRemoval(manifest, ["b"], ["a"])).toEqual([])
})

test("moduleEnvKeys lists keys only the module adds", () => {
  expect(moduleEnvKeys("A=1\nKEY=\nB=2\n", "A=1\nB=2\n")).toEqual(["KEY"])
})

function files(root: string, dir = root): Record<string, string> {
  return Object.fromEntries(
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === ".env" || entry.name === ".findplate") return []
      const path = join(dir, entry.name)
      return entry.isDirectory()
        ? Object.entries(files(root, path))
        : [[relative(root, path), readFileSync(path, "utf8")]]
    }),
  )
}

const base = { name: "demo", install: false, git: false, agents: false, skills: false, yes: true }

test("remove undoes add and matches a fresh project without the module", async () => {
  const work = mkdtempSync(join(tmpdir(), "fp-remove-"))
  const fresh = join(work, "fresh")
  const target = join(work, "demo")
  await create({ ...base, dir: fresh, modules: "" })
  await create({ ...base, dir: target, modules: "" })
  await addCommand({ dir: target, modules: ["telegram"], install: false, force: true, yes: true })
  expect(loadState(target)?.answers.modules).toEqual(["telegram", "webhooks"])
  expect(existsSync(join(target, "packages/telegram"))).toBe(true)

  await expect(
    removeCommand({ dir: target, modules: ["webhooks"], force: true, dryRun: false, dropMigrations: false }),
  ).rejects.toThrow("telegram requires webhooks")

  const flags = { dir: target, force: true, dryRun: false, dropMigrations: false }
  await removeCommand({ ...flags, modules: ["telegram", "webhooks"], dryRun: true })
  expect(existsSync(join(target, "packages/telegram"))).toBe(true)

  await removeCommand({ ...flags, modules: ["telegram", "webhooks"] })
  expect(loadState(target)?.answers.modules).toEqual([])
  expect(existsSync(join(target, "packages/telegram"))).toBe(false)
  expect(files(target)).toEqual(files(fresh))
})

test("remove leaves edited module files and the migration alone", async () => {
  const work = mkdtempSync(join(tmpdir(), "fp-remove-"))
  const target = join(work, "demo")
  await create({ ...base, dir: target, modules: "ai" })
  const edited = join(target, "packages/ai/package.json")
  writeFileSync(edited, `${readFileSync(edited, "utf8")}\n`)
  await removeCommand({ dir: target, modules: ["ai"], force: false, dryRun: false, dropMigrations: false })
  expect(existsSync(edited)).toBe(true)
  expect(loadState(target)?.answers.modules).not.toContain("ai")
})
