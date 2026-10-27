import { spawn } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { type ProjectState, saveState } from "../state"
import type { Command, PlanStep, RunCommand, Stdin } from "./plan"

export interface ExecResult {
  code: number
  stdout: string
  stderr: string
}

/** Runs one program. Stdin is written and closed, never echoed. */
export type Exec = (cmd: string, args: string[], cwd: string, stdin?: string) => Promise<ExecResult>

export const realExec: Exec = (cmd, args, cwd, stdin) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, GH_PROMPT_DISABLED: "1", FORCE_COLOR: "0" } })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("error", reject)
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }))
    child.stdin.on("error", () => {})
    child.stdin.end(stdin ?? "")
  })

export function parseEnv(source: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const line of source.split("\n")) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim())
    if (match?.[1] && match[2]) values[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2")
  }
  return values
}

export const readEnv = (dir: string): Record<string, string> =>
  existsSync(join(dir, ".env")) ? parseEnv(readFileSync(join(dir, ".env"), "utf8")) : {}

const fill = (text: string, vars: Record<string, string>) =>
  text.replaceAll(/\$\{(\w+)\}/g, (_, name) => vars[name] ?? "")

async function stdinValue(stdin: Stdin, ctx: { dir: string; vars: Record<string, string>; exec: Exec }) {
  if ("text" in stdin) return stdin.text
  if ("var" in stdin) return ctx.vars[stdin.var] ?? ""
  if ("env" in stdin) return readEnv(ctx.dir)[stdin.env] ?? ""
  const token = await ctx.exec("gh", ["auth", "token"], ctx.dir)
  if (token.code !== 0) throw new Error("gh auth token failed, run gh auth login")
  return token.stdout.trim()
}

/** First line of an error, with nothing that could be a value from stdin. */
const brief = (text: string) =>
  text
    .split("\n")
    .find((line) => line.trim())
    ?.trim()
    .slice(0, 200) ?? "failed"

async function runCommand(
  command: RunCommand,
  ctx: { dir: string; vars: Record<string, string>; exec: Exec },
): Promise<void> {
  if (command.skipIf && ctx.vars[command.skipIf]) return
  if (command.stdin && "var" in command.stdin && !ctx.vars[command.stdin.var]) return
  const stdin = command.stdin ? await stdinValue(command.stdin, ctx) : undefined
  if (command.stdin && "env" in command.stdin && !stdin) throw new Error(`${command.stdin.env} has no value in .env`)
  const args = command.args.map((arg) => fill(arg, ctx.vars))
  const result = await ctx.exec(command.cmd, args, ctx.dir, stdin)
  if (result.code !== 0) {
    const message = `${result.stderr}\n${result.stdout}`
    if (command.okIf?.test(message)) return
    throw new Error(`${command.cmd} ${args.slice(0, 3).join(" ")}: ${brief(result.stderr || result.stdout)}`)
  }
  if (command.capture) {
    const value = result.stdout.trim().split("\n")[0] ?? ""
    if (value) ctx.vars[command.capture] = value
  }
}

function writeFile(dir: string, command: Extract<Command, { kind: "write" }>) {
  const path = join(dir, command.path)
  if (existsSync(path)) return
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, command.content)
}

export interface StepOutcome {
  id: string
  title: string
  status: "done" | "skipped" | "failed"
  error?: string
}

/**
 * Runs the plan one step at a time. A finished step is saved in `.findplate/state.json`, so a second run only does
 * what is left, and every command also treats "already exists" as success.
 */
export async function runPlan(
  plan: PlanStep[],
  opts: { dir: string; state: ProjectState; exec?: Exec; onStep?: (step: PlanStep) => void },
): Promise<StepOutcome[]> {
  const exec = opts.exec ?? realExec
  opts.state.github ??= { done: [], vars: {} }
  const github = opts.state.github
  const outcomes: StepOutcome[] = []
  for (const step of plan) {
    if (github.done.includes(step.id)) {
      outcomes.push({ id: step.id, title: step.title, status: "skipped" })
      continue
    }
    opts.onStep?.(step)
    try {
      for (const command of step.commands) {
        if (command.kind === "write") writeFile(opts.dir, command)
        else await runCommand(command, { dir: opts.dir, vars: github.vars, exec })
      }
      github.done.push(step.id)
      saveState(opts.dir, opts.state)
      outcomes.push({ id: step.id, title: step.title, status: "done" })
    } catch (error) {
      saveState(opts.dir, opts.state)
      const message = error instanceof Error ? error.message : String(error)
      outcomes.push({ id: step.id, title: step.title, status: "failed", error: message })
      if (!step.optional) break
    }
  }
  return outcomes
}
