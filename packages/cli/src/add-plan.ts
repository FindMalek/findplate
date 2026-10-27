import type { Manifest } from "./manifest"

/** Content hash per project-relative path. */
export type Tree = ReadonlyMap<string, string>

export type Action = "create" | "update" | "same" | "conflict"

export interface FileAction {
  path: string
  action: Action
}

/** The modules to switch on: the asked ones plus whatever they require, minus those already enabled. */
export function resolveModules(manifest: Manifest, enabled: readonly string[], asked: readonly string[]): string[] {
  const unknown = asked.filter((id) => !manifest.modules[id])
  if (unknown.length) throw new Error(`Unknown module(s): ${unknown.join(", ")}`)
  const next = new Set<string>()
  const visit = (id: string) => {
    if (enabled.includes(id) || next.has(id)) return
    next.add(id)
    for (const required of manifest.modules[id]?.requires ?? []) visit(required)
  }
  for (const id of asked) visit(id)
  return [...next]
}

/**
 * Compares what the template gives before the module (`before`) and after it (`after`) with the project (`current`).
 * Files the user never touched are updated, files they edited are conflicts and are left alone.
 */
export function planAdd(before: Tree, after: Tree, current: Tree): FileAction[] {
  const actions: FileAction[] = []
  for (const [path, hash] of after) {
    const have = current.get(path)
    const was = before.get(path)
    let action: Action
    if (have === hash) action = "same"
    else if (have === undefined) action = was === undefined ? "create" : was === hash ? "same" : "conflict"
    else action = have === was ? "update" : "conflict"
    actions.push({ path, action })
  }
  return actions.sort((a, b) => a.path.localeCompare(b.path))
}

/** `.env` lines for keys the project doesn't have yet, taken from the freshly generated `.env`. */
export function missingEnvLines(generated: string, current: string, values: Record<string, string> = {}): string[] {
  const have = new Set([...current.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]))
  const lines: string[] = []
  for (const match of generated.matchAll(/^([A-Z][A-Z0-9_]*)=(.*)$/gm)) {
    const key = match[1]!
    if (!have.has(key)) lines.push(`${key}=${values[key] ?? match[2]}`)
  }
  return lines
}
