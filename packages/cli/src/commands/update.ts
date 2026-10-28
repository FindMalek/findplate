import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import * as p from "@clack/prompts"
import { generate } from "../generate"
import { toNames } from "../generate/rename"
import { type FileTriple, mergeFile, planFile, type UpdateAction } from "../merge-plan"
import { templateDir } from "../paths"
import { RM_OPTIONS, toPosix } from "../platform"
import { listPresets } from "../presets"
import { run } from "../run"
import { loadState, type ProjectState, saveState } from "../state"
import { bold, dim } from "../ui"

export interface UpdateFlags {
  dir?: string
  force: boolean
  dryRun: boolean
  /** Template of the recorded version, instead of downloading it from npm. */
  baseTemplate?: string
  /** Version of the running cli, which is the one being updated to. */
  version: string
}

const IGNORED = new Set(["node_modules", ".next", ".turbo", ".git", ".findplate", "dist"])

function walk(root: string, dir = root): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORED.has(entry.name)) return []
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(root, path) : [toPosix(relative(root, path))]
  })
}

const read = (root: string, file: string) => {
  const path = join(root, file)
  return existsSync(path) ? readFileSync(path) : undefined
}

function dirtyGit(dir: string): string | undefined {
  if (!existsSync(join(dir, ".git"))) return "isn't a git repository, so changes can't be undone"
  return execFileSync("git", ["status", "--porcelain"], { cwd: dir, encoding: "utf8" }).trim()
    ? "has uncommitted changes"
    : undefined
}

/** Downloads the template that `version` shipped, from the npm package. */
async function fetchTemplate(version: string, into: string): Promise<string> {
  mkdirSync(into, { recursive: true })
  await run("npm", ["pack", `findplate@${version}`, "--pack-destination", into, "--silent"], into)
  const tarball = readdirSync(into).find((name) => name.endsWith(".tgz"))
  if (!tarball) throw new Error(`Couldn't download findplate@${version}`)
  await run("tar", ["-xzf", tarball], into)
  return join(into, "package", "template")
}

export async function update(flags: UpdateFlags) {
  const dir = resolve(flags.dir ?? ".")
  const state = loadState(dir)
  if (!state) throw new Error(`${dir} has no .findplate/state.json, it wasn't created by findplate`)
  const from = state.cliVersion
  if (!from && !flags.baseTemplate) {
    throw new Error(
      "This project doesn't record its findplate version. Pass --base-template <dir> to merge from a template",
    )
  }
  if (from === flags.version && !flags.baseTemplate) return p.log.success(`Already on findplate ${flags.version}`)
  if (!flags.force && !flags.dryRun) {
    const problem = dirtyGit(dir)
    if (problem) throw new Error(`${dir} ${problem}. Commit or stash first, or use --force`)
  }

  const work = mkdtempSync(join(tmpdir(), "findplate-update-"))
  try {
    const baseSource = flags.baseTemplate
      ? resolve(flags.baseTemplate)
      : await fetchTemplate(from as string, join(work, "pack"))
    const { answers } = state
    const preset = listPresets().find((candidate) => candidate.id === answers.preset)
    if (!preset) throw new Error(`Unknown preset "${answers.preset}" in .findplate/state.json`)
    const render = (templateRoot: string, target: string) => {
      generate({
        templateDir: templateRoot,
        target,
        names: toNames(answers.name),
        pitch: answers.pitch,
        preset,
        modules: new Set(answers.modules),
        env: {},
        postgresPort: answers.postgresPort,
      })
      rmSync(join(target, ".env"), { force: true })
    }
    const base = join(work, "base")
    const next = join(work, "next")
    render(baseSource, base)
    render(templateDir(), next)

    const counts: Record<UpdateAction, string[]> = {
      keep: [],
      add: [],
      update: [],
      delete: [],
      merge: [],
      conflict: [],
    }
    const conflicts = new Set<string>()
    for (const file of new Set([...walk(base), ...walk(next)])) {
      const triple: FileTriple = { base: read(base, file), next: read(next, file), ours: read(dir, file) }
      const action = planFile(triple)
      counts[action].push(file)
      if (action === "conflict") conflicts.add(file)
      if (flags.dryRun || action === "keep" || action === "conflict") continue
      const path = join(dir, file)
      if (action === "delete") {
        unlinkSync(path)
        continue
      }
      let content = triple.next as Buffer
      if (action === "merge") {
        const merged = mergeFile({ base: triple.base, ours: triple.ours as Buffer, next: content })
        content = merged.content
        if (merged.conflicts) conflicts.add(file)
      }
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, content, { mode: statSync(join(next, file)).mode })
    }

    const verb = flags.dryRun ? "would be" : "were"
    p.log.info(
      [
        `${counts.update.length} files ${verb} updated, ${counts.add.length} added, ${counts.delete.length} removed, ${counts.merge.length} merged`,
        `${counts.keep.length} files are unchanged by the template ${dim("and left alone")}`,
      ].join("\n"),
    )
    if (conflicts.size) {
      p.log.warn(
        `${bold("Resolve these by hand")} (conflict markers or untouched files):\n${[...conflicts].map((file) => `  ${file}`).join("\n")}`,
      )
    }
    if (!flags.dryRun) {
      const saved: ProjectState = { ...state, cliVersion: flags.version }
      saveState(dir, saved)
      p.outro(`Updated${from ? ` from ${from}` : ""} to ${flags.version}. Review with git diff, then run pnpm install`)
    }
  } finally {
    rmSync(work, RM_OPTIONS)
  }
}
