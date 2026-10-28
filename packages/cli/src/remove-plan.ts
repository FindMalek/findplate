import type { Manifest } from "./manifest"
import { type FileTriple, planFile, type UpdateAction } from "./merge-plan"

export type RemoveAction = UpdateAction | "edited"

const MIGRATIONS = "packages/db/drizzle/"

export const isMigration = (path: string) => path.replaceAll("\\", "/").startsWith(MIGRATIONS)

/** The modules to switch off, refusing when an enabled module outside the removal still requires one of them. */
export function resolveRemoval(manifest: Manifest, enabled: readonly string[], asked: readonly string[]): string[] {
  const unknown = asked.filter((id) => !manifest.modules[id])
  if (unknown.length) throw new Error(`Unknown module(s): ${unknown.join(", ")}`)
  const remove = asked.filter((id) => enabled.includes(id))
  const blockers = enabled
    .filter((id) => !remove.includes(id))
    .flatMap((id) =>
      (manifest.modules[id]?.requires ?? []).filter((req) => remove.includes(req)).map((req) => ({ id, req })),
    )
  if (blockers.length) {
    const needs = blockers.map((b) => `${b.id} requires ${b.req}`).join(", ")
    throw new Error(`Can't remove: ${needs}. Remove ${[...new Set(blockers.map((b) => b.id))].join(", ")} too`)
  }
  return remove
}

/**
 * What `findplate remove` does with one file. `base` is the render that still has the module, `next` the render
 * without it, `ours` the project. Untouched files follow the template, edited module files are kept ("edited").
 */
export function planRemoveFile(triple: FileTriple): RemoveAction {
  if (!triple.ours) return "keep"
  const action = planFile(triple)
  return action === "conflict" && !triple.next ? "edited" : action
}

/** `KEY=` names in a generated `.env` that the render without the module doesn't have. */
export function moduleEnvKeys(withEnv: string, withoutEnv: string): string[] {
  const keys = (text: string) => [...text.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1] as string)
  const kept = new Set(keys(withoutEnv))
  return keys(withEnv).filter((key) => !kept.has(key))
}
