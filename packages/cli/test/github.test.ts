import { expect, test } from "bun:test"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { type Exec, runPlan } from "../src/github/exec"
import { buildPlan, classifyEnv, formatPlan, type PlanInput, STATUSES } from "../src/github/plan"
import type { ProjectState } from "../src/state"

const input: PlanInput = {
  owner: "acme-co",
  repo: "demo",
  description: "Demo pitch",
  visibility: "private",
  project: true,
  envKeys: ["BETTER_AUTH_SECRET", "GROQ_API_KEY", "NEXT_PUBLIC_APP_URL", "DATABASE_URL", "POSTGRES_PORT"],
}

const newState = (): ProjectState => ({
  version: 1,
  answers: { name: "demo", pitch: "p", preset: "monochrome", modules: [], postgresPort: 5432, adminEmail: "" },
  done: [],
})

test("env keys split into secrets and variables, local-only values stay out", () => {
  expect(classifyEnv(input.envKeys)).toEqual({
    secrets: ["BETTER_AUTH_SECRET", "GROQ_API_KEY"],
    variables: ["NEXT_PUBLIC_APP_URL"],
  })
})

test("the plan covers repo, labels, board, rules and settings, and prints no secret values", () => {
  const plan = buildPlan(input)
  expect(plan.map((step) => step.id)).toEqual([
    "repo",
    "push",
    "labels",
    "milestones",
    "codeowners",
    "project",
    "settings",
    "ruleset",
  ])
  const text = formatPlan(plan)
  expect(text).toContain("gh repo create acme-co/demo --private")
  expect(text).toContain("gh secret set GROQ_API_KEY --repo acme-co/demo < $GROQ_API_KEY from .env")
  for (const { name } of STATUSES) expect(text).toContain(name)
  expect(buildPlan({ ...input, project: false }).map((step) => step.id)).not.toContain("project")
})

test("a second run does nothing, and a failed step is retried alone", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fp-gh-"))
  writeFileSync(join(dir, ".env"), "GROQ_API_KEY=gsk_secret_value\nNEXT_PUBLIC_APP_URL=http://localhost:3000\n")
  const calls: string[] = []
  const seen: string[] = []
  let rulesetFails = true
  const exec: Exec = async (cmd, args, _cwd, stdin) => {
    calls.push(`${cmd} ${args.join(" ")}`)
    if (stdin) seen.push(stdin)
    if (args[0] === "project" && args[1] === "create") return { code: 0, stdout: "7\n", stderr: "" }
    if (args[0] === "project" && args[1] === "field-list") return { code: 0, stdout: "PVTSSF_1\n", stderr: "" }
    if (args[0] === "auth") return { code: 0, stdout: "gho_token\n", stderr: "" }
    if (args.includes("--method") && rulesetFails) return { code: 1, stdout: "", stderr: "HTTP 403: upgrade" }
    return { code: 0, stdout: "", stderr: "" }
  }
  const plan = buildPlan({ ...input, envKeys: ["GROQ_API_KEY", "NEXT_PUBLIC_APP_URL"] })
  const state = newState()

  const first = await runPlan(plan, { dir, state, exec })
  expect(first.filter((o) => o.status === "failed").map((o) => o.id)).toEqual(["ruleset"])
  expect(state.github?.vars.projectNumber).toBe("7")
  expect(seen).toContain("gsk_secret_value")
  expect(JSON.stringify(first)).not.toContain("gsk_secret_value")
  expect(readFileSync(join(dir, ".github/CODEOWNERS"), "utf8")).toBe("* @acme-co\n")

  calls.length = 0
  rulesetFails = false
  const second = await runPlan(plan, { dir, state, exec })
  expect(second.filter((o) => o.status === "done").map((o) => o.id)).toEqual(["ruleset"])
  expect(calls.some((call) => call.includes("repo create"))).toBe(false)
  expect(calls.filter((call) => call.includes("--method"))).toHaveLength(1)
})

test("an existing repo or label counts as done", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fp-gh-"))
  const exec: Exec = async (cmd, args) =>
    cmd === "gh" && args[0] === "repo" && args[1] === "create"
      ? { code: 1, stdout: "", stderr: "GraphQL: Name already exists on this account" }
      : { code: 0, stdout: "", stderr: "" }
  const outcomes = await runPlan(buildPlan({ ...input, project: false, envKeys: [] }), { dir, state: newState(), exec })
  expect(outcomes.every((outcome) => outcome.status === "done")).toBe(true)
})
