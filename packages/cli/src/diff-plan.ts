import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { RM_OPTIONS } from "./platform"

/** Unified diff of one file, `before` or `after` missing means the file doesn't exist on that side. */
export function unifiedDiff(file: string, before?: Buffer, after?: Buffer): string {
  if (before?.includes(0) || after?.includes(0)) return `Binary file ${file} differs`
  const dir = mkdtempSync(join(tmpdir(), "findplate-diff-"))
  try {
    const [a, b] = [join(dir, "a"), join(dir, "b")]
    writeFileSync(a, before ?? "")
    writeFileSync(b, after ?? "")
    const out = spawnSync("git", ["diff", "--no-index", "--no-color", "--no-ext-diff", a, b], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
    if (out.error) throw new Error(`git diff failed: ${out.error.message}`)
    const body = out.stdout.slice(out.stdout.indexOf("@@"))
    if (!body.startsWith("@@")) return ""
    return `--- ${before ? `a/${file}` : "/dev/null"}\n+++ ${after ? `b/${file}` : "/dev/null"}\n${body.trimEnd()}`
  } finally {
    rmSync(dir, RM_OPTIONS)
  }
}
