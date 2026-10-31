import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { CliError, EXIT } from "../errors"
import { generate } from "../generate"
import { isValidSlug, toNames } from "../generate/rename"
import { loadManifest } from "../manifest"
import { templateDir } from "../paths"
import { RM_OPTIONS } from "../platform"
import { listPresets } from "../presets"
import { needsFor, pickModules } from "../profiles"
import { loadState } from "../state"
import { walk } from "./update"

export interface PlanFlags {
  dir?: string
  name?: string
  pitch?: string
  preset?: string
  modules?: string
  profile?: string
  json: boolean
}

export interface CreatePlan {
  name: string
  dir: string
  preset: string
  profile: string
  modules: string[]
  /** Modules switched on only because another one requires them. */
  added: { id: string; by: string }[]
  /** Env keys and servers the chosen modules need. */
  needs: { module: string; env?: string; label?: string; url?: string }[]
  files: string[]
}

/** What `create` would generate, resolved the way `create` resolves its flags, without writing to the target. */
export function planCreate(flags: PlanFlags): CreatePlan {
  const manifest = loadManifest()
  const name = flags.name ?? flags.dir
  if (!name) throw new CliError("--name or a directory is required", EXIT.usage)
  const names = toNames(name)
  if (!isValidSlug(names.slug)) throw new CliError(`"${name}" isn't a usable project name`, EXIT.usage)
  const target = resolve(flags.dir ?? names.slug)
  if (existsSync(target) && readdirSync(target).length && !loadState(target)) {
    throw new CliError(`${target} already exists and isn't empty`, EXIT.usage)
  }
  const presets = listPresets()
  const preset = presets.find((candidate) => candidate.id === (flags.preset ?? "monochrome"))
  if (!preset) {
    throw new CliError(
      `Unknown preset "${flags.preset}". Available: ${presets.map((x) => x.id).join(", ")}`,
      EXIT.usage,
    )
  }
  let picked: ReturnType<typeof pickModules>
  try {
    picked = pickModules(manifest, flags)
  } catch (error) {
    throw new CliError((error as Error).message, EXIT.usage)
  }

  const scratch = mkdtempSync(join(tmpdir(), "findplate-plan-"))
  try {
    generate({
      templateDir: templateDir(),
      target: scratch,
      names,
      pitch: flags.pitch ?? `${names.title}: the one-line pitch goes here.`,
      preset,
      modules: new Set(picked.modules),
      env: {},
      postgresPort: 5432,
    })
    return {
      name: names.slug,
      dir: target,
      preset: preset.id,
      profile: picked.profile,
      modules: picked.modules,
      added: picked.added,
      needs: needsFor(manifest, picked.modules).map((need) => ({
        module: need.module,
        env: need.key?.env,
        label: need.key?.label ?? need.server?.label,
        url: need.key?.url ?? need.server?.url,
      })),
      files: walk(scratch).sort(),
    }
  } finally {
    rmSync(scratch, RM_OPTIONS)
  }
}

export function planCommand(flags: PlanFlags) {
  const plan = planCreate(flags)
  if (flags.json) return console.info(JSON.stringify({ ok: true, plan }, null, 2))
  console.info(
    [
      `${plan.name} in ${plan.dir}, ${plan.preset} preset, ${plan.profile} profile`,
      `modules: ${plan.modules.join(", ") || "none"}`,
      ...plan.needs.map((need) => `needs ${need.env ?? need.label} (${need.module}) ${need.url ?? ""}`.trimEnd()),
      `${plan.files.length} files would be generated, nothing was written`,
    ].join("\n"),
  )
}
