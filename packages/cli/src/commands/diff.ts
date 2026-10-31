import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { unifiedDiff } from "../diff-plan"
import { CliError, EXIT } from "../errors"
import { RM_OPTIONS } from "../platform"
import { loadState } from "../state"
import { fetchTemplate, read, renderer, walk } from "./update"

export interface DiffFlags {
  dir?: string
  /** Template of the recorded version, instead of downloading it from npm. */
  baseTemplate?: string
}

export interface FileDiff {
  file: string
  status: "modified" | "added" | "removed"
  diff: string
}

const isEnv = (file: string) => /(^|\/)\.env(\.(?!example$).+)?$/.test(file)

/** Files of `dir` that differ from the freshly rendered `base`. */
export function diffProject(base: string, dir: string): FileDiff[] {
  const out: FileDiff[] = []
  for (const file of [...new Set([...walk(base), ...walk(dir)])].sort()) {
    if (isEnv(file)) continue
    const [before, after] = [read(base, file), read(dir, file)]
    if (before && after && before.equals(after)) continue
    out.push({
      file,
      status: !before ? "added" : !after ? "removed" : "modified",
      diff: unifiedDiff(file, before, after),
    })
  }
  return out
}

export async function diffCommand(flags: DiffFlags) {
  const dir = resolve(flags.dir ?? ".")
  const state = loadState(dir)
  if (!state) throw new CliError(`${dir} has no .findplate/state.json, it wasn't created by findplate`, EXIT.usage)
  if (!state.cliVersion && !flags.baseTemplate) {
    throw new CliError("This project doesn't record its findplate version. Pass --base-template <dir>", EXIT.usage)
  }
  const work = mkdtempSync(join(tmpdir(), "findplate-diff-"))
  try {
    const source = flags.baseTemplate
      ? resolve(flags.baseTemplate)
      : await fetchTemplate(state.cliVersion as string, join(work, "pack"))
    const base = join(work, "base")
    renderer(state)(source, base)
    const changes = diffProject(base, dir)
    if (!changes.length)
      return console.info(`No differences from the template${state.cliVersion ? ` ${state.cliVersion}` : ""}`)
    for (const change of changes) console.info(`${change.status} ${change.file}\n${change.diff}\n`)
    console.info(`${changes.length} files differ`)
  } finally {
    rmSync(work, RM_OPTIONS)
  }
}
