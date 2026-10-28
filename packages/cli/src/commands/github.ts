import { existsSync } from "node:fs"
import { basename, resolve } from "node:path"
import * as p from "@clack/prompts"
import { loadConfig } from "../config"
import { type Exec, readEnv, realExec, runPlan, type StepOutcome } from "../github/exec"
import { buildPlan, formatPlan, type PlanInput } from "../github/plan"
import { loadState, type ProjectState, saveState } from "../state"
import { accent, dim } from "../ui"

export interface GithubFlags {
  dir?: string
  owner?: string
  homepage?: string
  public?: boolean
  project: boolean
  projectToken?: boolean
  projectTemplate?: string
  dryRun: boolean
}

const skeleton = (dir: string): ProjectState => ({
  version: 1,
  answers: { name: basename(dir), pitch: "", preset: "", modules: [], postgresPort: 0, adminEmail: "" },
  done: [],
})

/** Whether gh is installed and logged in, with the login name to use as the default owner. */
async function ghProtocol(exec: Exec, cwd: string): Promise<"ssh" | "https"> {
  try {
    const result = await exec("gh", ["config", "get", "git_protocol"], cwd)
    return result.code === 0 && result.stdout.trim() === "ssh" ? "ssh" : "https"
  } catch {
    return "https"
  }
}

export async function ghLogin(exec: Exec = realExec, cwd = process.cwd()): Promise<string | undefined> {
  try {
    const result = await exec("gh", ["api", "user", "--jq", ".login"], cwd)
    return result.code === 0 ? result.stdout.trim() || undefined : undefined
  } catch {
    return undefined
  }
}

export async function planFor(dir: string, state: ProjectState, flags: GithubFlags, exec: Exec = realExec) {
  const owner = flags.owner ?? loadConfig().githubOwner ?? (await ghLogin(exec, dir))
  if (!owner)
    throw new Error("No GitHub owner. Run gh auth login, pass --owner, or findplate config set githubOwner <name>")
  const input: PlanInput = {
    owner,
    repo: basename(dir),
    description: state.answers.pitch || state.answers.name,
    homepage: flags.homepage,
    visibility: flags.public ? "public" : "private",
    protocol: await ghProtocol(exec, dir),
    project: flags.project,
    projectToken: flags.projectToken,
    projectTemplate: flags.projectTemplate ?? loadConfig().githubProjectTemplate,
    envKeys: Object.keys(readEnv(dir)),
  }
  return buildPlan(input)
}

/** Creates the repo, board, labels, milestones, rules, variables and secrets. Safe to run again. */
export async function provision(
  dir: string,
  state: ProjectState,
  flags: GithubFlags,
  onStep?: (title: string) => void,
): Promise<StepOutcome[]> {
  const plan = await planFor(dir, state, flags)
  return runPlan(plan, { dir, state, onStep: (step) => onStep?.(step.title) })
}

export async function github(flags: GithubFlags) {
  const dir = resolve(flags.dir ?? ".")
  if (!existsSync(dir)) throw new Error(`${dir} doesn't exist`)
  const state = loadState(dir) ?? skeleton(dir)

  if (flags.dryRun) {
    const plan = await planFor(dir, state, flags)
    p.log.info(`${dim("dry run, nothing is created")}\n${formatPlan(plan)}`)
    return
  }

  p.intro(`${accent("findplate github")} ${dim(basename(dir))}`)
  if (!(await ghLogin(realExec, dir))) throw new Error("gh isn't installed or isn't logged in, run gh auth login")
  const spin = p.spinner()
  const outcomes = await provision(dir, state, flags, (title) => spin.message(title))
  spin.stop("GitHub setup finished")
  saveState(dir, state)
  report(outcomes)
}

export function report(outcomes: StepOutcome[]) {
  for (const outcome of outcomes) {
    if (outcome.status === "done") p.log.success(outcome.title)
    else if (outcome.status === "skipped") p.log.info(`${outcome.title} ${dim("(already done)")}`)
    else p.log.warn(`${outcome.title}: ${outcome.error}`)
  }
  if (outcomes.some((outcome) => outcome.status === "failed"))
    p.log.info("Run findplate github again to retry what failed.")
}
