import { expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { missingEnvLines, planAdd, resolveModules } from "../src/add-plan"
import { addCommand } from "../src/commands/add"
import { create } from "../src/commands/create"
import { loadManifest } from "../src/manifest"
import { loadState } from "../src/state"

test("planAdd updates untouched files and leaves edited ones as conflicts", () => {
  const before = new Map([
    ["a.ts", "1"],
    ["b.ts", "1"],
    ["gone.ts", "1"],
  ])
  const after = new Map([
    ["a.ts", "2"],
    ["b.ts", "2"],
    ["c.ts", "1"],
    ["gone.ts", "2"],
  ])
  const current = new Map([
    ["a.ts", "1"],
    ["b.ts", "edited"],
  ])
  expect(planAdd(before, after, current)).toEqual([
    { path: "a.ts", action: "update" },
    { path: "b.ts", action: "conflict" },
    { path: "c.ts", action: "create" },
    { path: "gone.ts", action: "conflict" },
  ])
  expect(planAdd(after, after, after).every((entry) => entry.action === "same")).toBe(true)
})

test("resolveModules pulls in requires and skips enabled modules", () => {
  const manifest = {
    name: "",
    scope: "",
    skills: [],
    modules: {
      a: { label: "", hint: "", default: false, paths: [], packages: [], requires: ["b"] },
      b: { label: "", hint: "", default: false, paths: [], packages: [] },
    },
  }
  expect(resolveModules(manifest, [], ["a"])).toEqual(["a", "b"])
  expect(resolveModules(manifest, ["a", "b"], ["a"])).toEqual([])
  expect(() => resolveModules(manifest, [], ["nope"])).toThrow("Unknown module")
})

test("missingEnvLines only adds keys the project lacks", () => {
  expect(missingEnvLines("A=1\nB=2\n", "A=9\n", { B: "x" })).toEqual(["B=x"])
})

test("add enables a module in a generated project and is idempotent", async () => {
  const target = join(mkdtempSync(join(tmpdir(), "fp-add-")), "demo")
  await create({
    dir: target,
    name: "demo",
    modules: "",
    install: false,
    git: false,
    agents: false,
    skills: false,
    yes: true,
  })
  expect(existsSync(join(target, "packages/ai"))).toBe(false)
  writeFileSync(join(target, "README.md"), `${readFileSync(join(target, "README.md"), "utf8")}\nmine\n`)

  const flags = { dir: target, modules: ["ai"], install: false, force: false, yes: true }
  expect(Object.keys(loadManifest().modules)).toContain("ai")
  await addCommand(flags)
  expect(existsSync(join(target, "packages/ai"))).toBe(true)
  expect(loadState(target)?.answers.modules).toContain("ai")
  expect(readFileSync(join(target, "README.md"), "utf8")).toContain("mine")

  const state = readFileSync(join(target, ".findplate/state.json"), "utf8")
  await addCommand(flags)
  expect(readFileSync(join(target, ".findplate/state.json"), "utf8")).toBe(state)
})
