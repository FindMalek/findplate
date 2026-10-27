import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const file = (dir: string) => join(dir, ".findplate", "provision.json")

/** Ids of finished tasks only, never values or secrets. */
export function loadDone(dir: string): string[] {
  if (!existsSync(file(dir))) return []
  try {
    return (JSON.parse(readFileSync(file(dir), "utf8")) as { done: string[] }).done
  } catch {
    return []
  }
}

export function markTask(dir: string, id: string) {
  const done = loadDone(dir)
  if (done.includes(id)) return
  mkdirSync(join(dir, ".findplate"), { recursive: true })
  writeFileSync(file(dir), `${JSON.stringify({ version: 1, done: [...done, id] }, null, 2)}\n`)
}
