import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import * as p from "@clack/prompts"
import { CliError, EXIT } from "../errors"
import { generate } from "../generate"
import { toNames } from "../generate/rename"
import { capture } from "../git"
import { loadManifest } from "../manifest"
import { type FileTriple, mergeFile } from "../merge-plan"
import { templateDir } from "../paths"
import { listPresets } from "../presets"
import { isMigration, moduleEnvKeys, planRemoveFile, type RemoveAction, resolveRemoval } from "../remove-plan"
import { loadState, type ProjectState, saveState } from "../state"
import { readTree } from "../tree"
import { bold } from "../ui"
import { TEMPLATE_VERSION } from "../version"

export interface RemoveFlags {
  dir?: string
  modules: string[]
  force: boolean
  dryRun: boolean
  /** Also take out the module's drizzle migration, only safe when it never ran against a database. */
  dropMigrations: boolean
}

const BUILD_DIRS = new Set(["node_modules", ".next", ".turbo", "dist"])

/** Removes build leftovers and empty folders under `path`, so a removed package leaves nothing behind. */
function prune(path: string) {
  if (!existsSync(path) || !statSync(path).isDirectory()) return
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name)
    if (entry.isDirectory()) {
      if (BUILD_DIRS.has(entry.name)) rmSync(child, { recursive: true, force: true })
      else prune(child)
    } else if (entry.name.endsWith(".tsbuildinfo") || entry.name === "next-env.d.ts") unlinkSync(child)
  }
  if (!readdirSync(path).length) rmdirSync(path)
}

const read = (root: string, file: string) => {
  const path = join(root, file)
  return existsSync(path) ? readFileSync(path) : undefined
}

export async function removeCommand(flags: RemoveFlags) {
  const dir = resolve(flags.dir ?? ".")
  const state = loadState(dir)
  if (!state) throw new CliError(`${dir} has no .findplate/state.json, run this inside a findplate project`, EXIT.usage)
  if (!flags.modules.length) throw new CliError("Name the module(s) to remove, e.g. findplate remove ai", EXIT.usage)

  const manifest = loadManifest()
  let toRemove: string[]
  try {
    toRemove = resolveRemoval(manifest, state.answers.modules, flags.modules)
  } catch (error) {
    throw new CliError((error as Error).message, EXIT.usage)
  }
  if (!toRemove.length) {
    p.log.success(`${flags.modules.join(", ")} not enabled, nothing to do`)
    return
  }

  if (!flags.dryRun) {
    const status = await capture("git", ["status", "--porcelain", "--", ".", ":!.findplate"], dir)
    if (status && !flags.force) {
      throw new CliError("The git tree has uncommitted changes. Commit or stash them, or pass --force", EXIT.dirty)
    }
  }

  const preset = listPresets().find((candidate) => candidate.id === state.answers.preset)
  if (!preset) throw new CliError(`Unknown preset "${state.answers.preset}" in .findplate/state.json`)
  const modules = state.answers.modules.filter((id) => !toRemove.includes(id))

  const scratch = mkdtempSync(join(tmpdir(), "findplate-remove-"))
  try {
    const render = (ids: string[], name: string) => {
      const target = join(scratch, name)
      generate({
        templateDir: templateDir(),
        target,
        names: toNames(state.answers.name),
        pitch: state.answers.pitch,
        preset,
        modules: new Set(ids),
        env: {},
        postgresPort: state.answers.postgresPort,
      })
      return target
    }
    const withModule = render(state.answers.modules, "with")
    const without = render(modules, "without")
    const withTree = readTree(withModule)
    const withoutTree = readTree(without)

    const held: string[] = []
    const plan: { path: string; action: RemoveAction }[] = []
    for (const path of new Set([...withTree.keys(), ...withoutTree.keys()])) {
      if (withTree.get(path) === withoutTree.get(path)) continue
      if (isMigration(path) && !flags.dropMigrations) {
        held.push(path)
        continue
      }
      const triple: FileTriple = { base: read(withModule, path), next: read(without, path), ours: read(dir, path) }
      plan.push({ path, action: planRemoveFile(triple) })
    }
    plan.sort((a, b) => a.path.localeCompare(b.path))

    const stuck = plan.filter((entry) => entry.action === "edited" || entry.action === "conflict")
    const left = flags.force ? [] : stuck.map((entry) => entry.path)
    const forced = flags.force ? stuck.map((entry) => entry.path) : []
    const conflicts: string[] = []
    if (!flags.dryRun) {
      for (const { path, action } of plan) {
        const file = join(dir, path)
        const next = read(without, path)
        if (action === "keep") continue
        if (action === "delete" || (action === "edited" && flags.force)) {
          rmSync(file, { force: true })
        } else if (action === "update" || (action === "conflict" && flags.force)) {
          mkdirSync(dirname(file), { recursive: true })
          writeFileSync(file, next as Buffer, { mode: statSync(join(without, path)).mode })
        } else if (action === "merge") {
          const merged = mergeFile({
            base: read(withModule, path),
            ours: read(dir, path) as Buffer,
            next: next as Buffer,
          })
          writeFileSync(file, merged.content)
          if (merged.conflicts) conflicts.push(path)
        }
      }
    }
    if (!flags.dryRun) {
      for (const id of toRemove) for (const path of manifest.modules[id]?.paths ?? []) prune(join(dir, path))
    }

    const count = (...actions: RemoveAction[]) => plan.filter((entry) => actions.includes(entry.action)).length
    const verb = flags.dryRun ? "would be" : "were"
    p.log.success(
      `${bold(toRemove.join(", "))}: ${count("delete")} files ${verb} deleted, ${count("update", "merge")} updated`,
    )
    if (flags.dryRun) {
      p.log.info(plan.map((entry) => `  ${entry.action.padEnd(8)} ${entry.path}`).join("\n"))
    }
    if (forced.length) {
      p.log.warn(
        `--force replaced or deleted ${forced.length} files you edited (git checkout restores them):\n${forced.map((path) => `  ${path}`).join("\n")}`,
      )
    }
    if (left.length) {
      p.log.warn(
        `${left.length} files you edited were left alone, delete or merge them by hand (git diff shows what the module added), or re-run with --force:\n${left.map((path) => `  ${path}`).join("\n")}`,
      )
    }
    if (conflicts.length) {
      p.log.warn(
        `${bold("Resolve the conflict markers")} (<<<<<<< yours) in:\n${conflicts.map((c) => `  ${c}`).join("\n")}`,
      )
    }

    const keys = moduleEnvKeys(
      readFileSync(join(withModule, ".env"), "utf8"),
      readFileSync(join(without, ".env"), "utf8"),
    )
    const envFile = join(dir, ".env")
    const inEnv = existsSync(envFile) ? readFileSync(envFile, "utf8") : ""
    const present = keys.filter((key) => new RegExp(`^${key}=`, "m").test(inEnv))
    if (present.length) {
      p.log.info(
        `.env is never edited. Remove these keys from it yourself once nothing uses them:\n${present.map((k) => `  ${k}`).join("\n")}`,
      )
    }

    if (held.length) {
      p.log.warn(
        `${bold("Database kept.")} The module's migration is still in the project and its tables are still in your database:\n${held.map((path) => `  ${path}`).join("\n")}\nDropping an applied migration breaks databases that ran it. If it never ran anywhere, re-run with --drop-migrations. Otherwise add a new migration that drops the tables.`,
      )
    } else if (flags.dropMigrations && !flags.dryRun) {
      p.log.warn("Migrations were removed. If the tables already exist in a database, drop them by hand")
    }

    if (!flags.dryRun) {
      const next: ProjectState = {
        ...state,
        templateVersion: TEMPLATE_VERSION,
        answers: { ...state.answers, modules },
      }
      saveState(dir, next)
      p.log.info("Run pnpm install to prune the lockfile, then pnpm check-types")
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}
