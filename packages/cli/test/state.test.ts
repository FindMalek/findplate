import { expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { create } from "../src/commands/create"
import { loadConfig, setConfig } from "../src/config"
import { loadState } from "../src/state"

test("config is saved private, and unset removes the key", () => {
  const file = join(mkdtempSync(join(tmpdir(), "fp-config-")), "findplate", "config.json")
  setConfig("dokployUrl", "https://dokploy.example.com", file)
  setConfig("githubOwner", "acme", file)
  expect(statSync(file).mode & 0o777).toBe(0o600)
  setConfig("githubOwner", "", file)
  expect(loadConfig(file)).toEqual({ dokployUrl: "https://dokploy.example.com" })
})

test("re-running create in an interrupted project resumes from its saved answers", async () => {
  const target = join(mkdtempSync(join(tmpdir(), "fp-resume-")), "demo")
  const flags = { dir: target, install: false, git: false, agents: false, skills: false, yes: true }
  await create({ ...flags, name: "demo", pitch: "first pitch", modules: "ai" })
  const first = loadState(target)
  expect(first?.done).toEqual(["generate"])

  mkdirSync(join(target, "stray"), { recursive: true })
  writeFileSync(join(target, ".findplate", "state.json"), JSON.stringify({ ...first, done: [] }))
  await create({ ...flags, name: "demo", pitch: "ignored", modules: "storage" })

  expect(existsSync(join(target, "stray"))).toBe(false)
  expect(existsSync(join(target, "packages/ai"))).toBe(true)
  expect(existsSync(join(target, "packages/storage"))).toBe(false)
  expect(readFileSync(join(target, "apps/web/lib/site.ts"), "utf8")).toContain("first pitch")
  expect(loadState(target)?.done).toEqual(["generate"])
})

test("a resume keeps the api keys already in .env", async () => {
  const target = join(mkdtempSync(join(tmpdir(), "fp-keys-")), "demo")
  const flags = {
    dir: target,
    install: false,
    git: false,
    agents: false,
    skills: false,
    yes: true,
    name: "demo",
    modules: "ai",
  }
  await create(flags)
  const envFile = join(target, ".env")
  writeFileSync(envFile, readFileSync(envFile, "utf8").replace(/^GROQ_API_KEY=.*$/m, "GROQ_API_KEY=gsk_test"))
  writeFileSync(join(target, ".findplate", "state.json"), JSON.stringify({ ...loadState(target), done: [] }))
  await create(flags)
  expect(readFileSync(envFile, "utf8")).toContain("GROQ_API_KEY=gsk_test")
})

test("a fresh project has a clean git tree after create", async () => {
  const target = join(mkdtempSync(join(tmpdir(), "fp-clean-")), "demo")
  const identity = {
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@t.t",
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@t.t",
  }
  Object.assign(process.env, identity)
  await create({ dir: target, install: false, git: true, yes: true, name: "demo", modules: "" })
  for (const key of Object.keys(identity)) delete process.env[key]
  const status = Bun.spawnSync(["git", "status", "--porcelain"], { cwd: target }).stdout.toString()
  expect(status).toBe("")
})
