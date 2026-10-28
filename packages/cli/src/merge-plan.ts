import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { RM_OPTIONS } from "./platform"

/** One file seen in the recorded template (`base`), the new template (`next`) and the project (`ours`). */
export interface FileTriple {
  base?: Buffer
  next?: Buffer
  ours?: Buffer
}

export type UpdateAction =
  | "keep"
  | "add"
  | "update"
  | "delete"
  /** needs a 3-way merge */
  | "merge"
  /** can't be merged, the project file stays as it is */
  | "conflict"

const same = (a?: Buffer, b?: Buffer) => (a && b ? a.equals(b) : a === b)
const isBinary = (buffer: Buffer) => buffer.includes(0)

/** What `findplate update` does with one file. Files the template didn't change are never touched. */
export function planFile({ base, next, ours }: FileTriple): UpdateAction {
  if (same(base, next) || same(ours, next)) return "keep"
  if (!ours) return base ? "conflict" : "add"
  if (same(ours, base)) return next ? "update" : "delete"
  if (!next) return "conflict"
  return isBinary(ours) || isBinary(next) || (base && isBinary(base)) ? "conflict" : "merge"
}

export interface MergeResult {
  content: Buffer
  conflicts: number
}

/** `git merge-file -p`: exit code is the number of conflicts, negative on error. */
export function mergeFile(triple: Required<Pick<FileTriple, "ours" | "next">> & Pick<FileTriple, "base">): MergeResult {
  const dir = mkdtempSync(join(tmpdir(), "findplate-merge-"))
  try {
    const paths = { ours: join(dir, "ours"), base: join(dir, "base"), next: join(dir, "next") }
    writeFileSync(paths.ours, triple.ours)
    writeFileSync(paths.base, triple.base ?? "")
    writeFileSync(paths.next, triple.next)
    const result = spawnSync(
      "git",
      [
        "merge-file",
        "-p",
        "-L",
        "yours",
        "-L",
        "previous template",
        "-L",
        "new template",
        paths.ours,
        paths.base,
        paths.next,
      ],
      { maxBuffer: 64 * 1024 * 1024 },
    )
    if (result.error || result.status === null || result.status > 127) {
      throw new Error(`git merge-file failed: ${result.error?.message ?? result.stderr?.toString()}`)
    }
    return { content: result.stdout, conflicts: result.status }
  } finally {
    rmSync(dir, RM_OPTIONS)
  }
}
