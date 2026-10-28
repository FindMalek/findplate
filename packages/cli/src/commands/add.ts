import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import * as p from "@clack/prompts"
import { missingEnvLines, planAdd, resolveModules } from "../add-plan"
import { CliError, EXIT } from "../errors"
import { generate } from "../generate"
import { toNames } from "../generate/rename"
import { capture } from "../git"
import { loadManifest } from "../manifest"
import { templateDir } from "../paths"
import { RM_OPTIONS, toPosix } from "../platform"
import { listPresets } from "../presets"
import { has, run } from "../run"
import { loadState, type ProjectState, saveState } from "../state"
import { readTree } from "../tree"
import { bold, dim } from "../ui"
import { TEMPLATE_VERSION } from "../version"

export interface AddFlags {
  dir?: string
  modules: string[]
  install: boolean
  force: boolean
  yes: boolean
}

export async function addCommand(flags: AddFlags) {
  const dir = resolve(flags.dir ?? ".")
  const state = loadState(dir)
  if (!state) throw new CliError(`${dir} has no .findplate/state.json, run this inside a findplate project`, EXIT.usage)
  if (!flags.modules.length) throw new CliError("Name the module(s) to add, e.g. findplate add ai", EXIT.usage)

  const manifest = loadManifest()
  const toAdd = resolveModules(manifest, state.answers.modules, flags.modules)
  if (!toAdd.length) {
    p.log.success(`${flags.modules.join(", ")} already enabled, nothing to do`)
    return
  }

  const status = await capture("git", ["status", "--porcelain", "--", ".", ":!.findplate"], dir)
  if (status && !flags.force) {
    throw new CliError("The git tree has uncommitted changes. Commit or stash them, or pass --force", EXIT.dirty)
  }

  const preset = listPresets().find((candidate) => candidate.id === state.answers.preset)
  if (!preset) throw new CliError(`Unknown preset "${state.answers.preset}" in .findplate/state.json`)
  const names = toNames(state.answers.name)
  const modules = [...state.answers.modules, ...toAdd]

  const env: Record<string, string> = {}
  if (!flags.yes && process.stdin.isTTY) {
    for (const id of toAdd) {
      for (const key of manifest.modules[id]?.keys ?? []) {
        const answer = await p.password({ message: `${key.label} ${dim(`(optional, ${key.url})`)}`, mask: "•" })
        if (p.isCancel(answer)) return p.cancel("Nothing was changed.")
        if (answer) env[key.env] = answer
      }
    }
  }

  const scratch = mkdtempSync(join(tmpdir(), "findplate-add-"))
  try {
    const render = (ids: string[], name: string) => {
      const target = join(scratch, name)
      generate({
        templateDir: templateDir(),
        target,
        names,
        pitch: state.answers.pitch,
        preset,
        modules: new Set(ids),
        env,
        postgresPort: state.answers.postgresPort,
      })
      return target
    }
    const before = render(state.answers.modules, "before")
    const after = render(modules, "after")
    const plan = planAdd(readTree(before), readTree(after), readTree(dir))

    const write = plan.filter((entry) => entry.action === "create" || entry.action === "update" || flags.force)
    for (const entry of write.filter((item) => item.action !== "same")) {
      mkdirSync(dirname(join(dir, entry.path)), { recursive: true })
      cpSync(join(after, entry.path), join(dir, entry.path))
    }

    const lines = missingEnvLines(
      readFileSync(join(after, ".env"), "utf8"),
      existsSync(join(dir, ".env")) ? readFileSync(join(dir, ".env"), "utf8") : "",
      env,
    )
    if (lines.length)
      appendFileSync(join(dir, ".env"), `\n# added by findplate add ${toAdd.join(" ")}\n${lines.join("\n")}\n`)

    const next: ProjectState = {
      ...state,
      templateVersion: TEMPLATE_VERSION,
      answers: { ...state.answers, modules },
    }
    saveState(dir, next)

    const created = plan.filter((entry) => entry.action === "create").length
    const updated = plan.filter((entry) => entry.action === "update").length
    const conflicts = plan.filter((entry) => entry.action === "conflict")
    p.log.success(`Added ${bold(toAdd.join(", "))}: ${created} files created, ${updated} updated`)
    if (lines.length) p.log.info(`${lines.length} keys added to .env, fill them in`)
    if (conflicts.length && !flags.force) {
      p.log.warn(
        `${conflicts.length} files you changed were left alone, merge by hand or re-run with --force:\n${conflicts.map((c) => `  ${c.path}`).join("\n")}`,
      )
    }
    if (flags.install && (await has("pnpm"))) await run("pnpm", ["install"], dir)
    else p.log.info("Run pnpm install to pick up the new packages")
  } finally {
    rmSync(scratch, RM_OPTIONS)
  }
}
