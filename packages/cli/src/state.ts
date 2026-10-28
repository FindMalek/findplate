import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

export const STEPS = ["generate", "agents", "skills", "install", "format", "git", "github"] as const
export type Step = (typeof STEPS)[number]

/** Progress of `findplate github`: finished plan steps and what they captured (project number and such). */
export interface GithubState {
  done: string[]
  vars: Record<string, string>
}

export interface ProjectState {
  version: 1
  /** findplate version that generated (or last updated) the project; `findplate update` merges from it. */
  cliVersion?: string
  answers: {
    name: string
    pitch: string
    preset: string
    /** minimal, standard, everything or custom. Absent in older projects. */
    profile?: string
    modules: string[]
    postgresPort: number
    adminEmail: string
  }
  done: Step[]
  /** Template version the project was generated from, updated by `findplate add`. Absent in older projects. */
  templateVersion?: string
  github?: GithubState
}

export const statePath = (dir: string) => join(dir, ".findplate", "state.json")

export function loadState(dir: string): ProjectState | undefined {
  const file = statePath(dir)
  if (!existsSync(file)) return undefined
  try {
    return JSON.parse(readFileSync(file, "utf8")) as ProjectState
  } catch {
    return undefined
  }
}

export function saveState(dir: string, state: ProjectState) {
  const file = statePath(dir)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`)
}

export function markDone(dir: string, state: ProjectState, step: Step) {
  if (!state.done.includes(step)) state.done.push(step)
  saveState(dir, state)
}
