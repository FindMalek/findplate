import { execFile } from "node:child_process"
import { spawnPlan } from "./platform"
import { run } from "./run"

export interface GitProbe {
  installed: boolean
  insideRepo: boolean
  defaultBranch?: string
}

export type GitPlan = { action: "init"; branch: string } | { action: "skip"; reason: "missing" | "existing" }

export function planGitInit(probe: GitProbe): GitPlan {
  if (!probe.installed) return { action: "skip", reason: "missing" }
  if (probe.insideRepo) return { action: "skip", reason: "existing" }
  return { action: "init", branch: probe.defaultBranch?.trim() || "main" }
}

export function capture(cmd: string, args: string[], cwd: string): Promise<string | undefined> {
  const plan = spawnPlan(cmd, args)
  return new Promise((resolve) =>
    execFile(plan.cmd, plan.args, { cwd, shell: plan.shell }, (error, stdout) =>
      resolve(error ? undefined : stdout.trim()),
    ),
  )
}

export async function probeGit(cwd: string): Promise<GitProbe> {
  const installed = (await capture("git", ["--version"], cwd)) !== undefined
  if (!installed) return { installed, insideRepo: false }
  return {
    installed,
    insideRepo: (await capture("git", ["rev-parse", "--is-inside-work-tree"], cwd)) === "true",
    defaultBranch: await capture("git", ["config", "--get", "init.defaultBranch"], cwd),
  }
}

/** Inits and makes the first commit unless git is missing or the folder already sits in a repo. */
export async function initRepo(cwd: string, afterInit?: () => void): Promise<string> {
  const plan = planGitInit(await probeGit(cwd))
  if (plan.action === "skip") {
    return plan.reason === "missing"
      ? "Skipped git, it isn't installed. Run git init later"
      : "Skipped git init, this folder is already inside a git repository"
  }
  await run("git", ["init", "-q", "-b", plan.branch], cwd)
  afterInit?.()
  await run("git", ["add", "-A"], cwd)
  try {
    await run("git", ["commit", "-q", "-m", "chore(repo): start from findplate"], cwd)
  } catch {
    return "Git repository created (set user.name and user.email to make the first commit)"
  }
  return `First commit on ${plan.branch}`
}
