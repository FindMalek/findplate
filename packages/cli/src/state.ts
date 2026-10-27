import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

export const STEPS = ["generate", "agents", "skills", "install", "format", "git"] as const
export type Step = (typeof STEPS)[number]

export interface ProjectState {
  version: 1
  answers: {
    name: string
    pitch: string
    preset: string
    modules: string[]
    postgresPort: number
    adminEmail: string
  }
  done: Step[]
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
