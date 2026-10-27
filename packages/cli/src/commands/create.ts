import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"
import * as p from "@clack/prompts"
import { applyAgents } from "../agents"
import { generate } from "../generate"
import { isValidSlug, toNames } from "../generate/rename"
import { loadManifest } from "../manifest"
import { templateDir } from "../paths"
import { listPresets } from "../presets"
import { freePort, has, run } from "../run"
import { loadState, markDone, type ProjectState, type Step, saveState } from "../state"
import { accent, bold, brand, dim } from "../ui"

export interface CreateFlags {
  dir?: string
  name?: string
  pitch?: string
  preset?: string
  modules?: string
  install: boolean
  git: boolean
  agents: boolean
  yes: boolean
}

/** The prompt's answer, or a clean exit when the user cancels (ctrl+c / esc). */
function answered<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) {
    p.cancel("Nothing was created.")
    process.exit(0)
  }
  return value as Exclude<T, symbol>
}

export async function create(flags: CreateFlags) {
  const manifest = loadManifest()
  const presets = listPresets()
  const canPrompt = !flags.yes && process.stdin.isTTY

  p.intro(`${brand("findplate")} ${dim("a full-stack project, set up in one go")}`)

  let name = flags.name ?? flags.dir
  if (!name) {
    if (!canPrompt) throw new Error("--name is required with --yes")
    const answer = answered(
      await p.text({
        message: "Project name",
        placeholder: "my-app",
        validate: (value) => (isValidSlug(toNames(value ?? "").slug) ? undefined : "3–40 letters, digits or dashes"),
      }),
    )
    name = answer
  }
  const names = toNames(name ?? "")
  if (!isValidSlug(names.slug)) throw new Error(`"${name}" isn't a usable project name`)
  const target = resolve(flags.dir ?? names.slug)
  const previous = existsSync(target) ? loadState(target) : undefined
  if (existsSync(target) && readdirSync(target).length && !previous) {
    throw new Error(`${target} already exists and isn't empty`)
  }
  const interactive = canPrompt && !previous
  if (previous) p.log.info(`Resuming ${bold(names.slug)}, finished steps are skipped`)

  let pitch = previous?.answers.pitch ?? flags.pitch
  if (!pitch && interactive) {
    const answer = answered(
      await p.text({
        message: "One-line pitch",
        placeholder: `What ${names.title} does, for whom`,
        defaultValue: `${names.title}: the one-line pitch goes here.`,
      }),
    )
    pitch = answer
  }
  pitch ??= `${names.title}: the one-line pitch goes here.`

  let presetId = previous?.answers.preset ?? flags.preset
  if (!presetId && interactive) {
    const answer = answered(
      await p.select({
        message: "Design preset",
        options: presets.map((preset) => ({ value: preset.id, label: preset.label, hint: preset.description })),
      }),
    )
    presetId = answer
  }
  const preset = presets.find((candidate) => candidate.id === (presetId ?? "monochrome"))
  if (!preset) throw new Error(`Unknown preset "${presetId}". Available: ${presets.map((x) => x.id).join(", ")}`)

  let modules: string[]
  if (previous) {
    modules = previous.answers.modules
  } else if (flags.modules !== undefined) {
    modules = flags.modules
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean)
    const unknown = modules.filter((m) => !manifest.modules[m])
    if (unknown.length) throw new Error(`Unknown module(s): ${unknown.join(", ")}`)
  } else if (interactive) {
    const answer = answered(
      await p.multiselect({
        message: "Modules",
        options: Object.entries(manifest.modules).map(([id, spec]) => ({
          value: id,
          label: spec.label,
          hint: spec.hint,
        })),
        initialValues: Object.entries(manifest.modules)
          .filter(([, spec]) => spec.default)
          .map(([id]) => id),
        required: false,
      }),
    )
    modules = answer
  } else {
    modules = Object.entries(manifest.modules)
      .filter(([, spec]) => spec.default)
      .map(([id]) => id)
  }

  const env: Record<string, string> = {}
  if (interactive) {
    for (const id of modules) {
      for (const key of manifest.modules[id]?.keys ?? []) {
        const answer = answered(
          await p.password({
            message: `${key.label} ${dim(`(optional, ${key.url})`)}`,
            mask: "•",
          }),
        )
        if (answer) env[key.env] = answer
      }
    }
  }

  const postgresPort = previous?.answers.postgresPort ?? (await freePort(5432))
  const canInstall = flags.install && (await has("pnpm"))
  let admin = { adminEmail: previous?.answers.adminEmail ?? "", adminPassword: "" }
  const state: ProjectState = previous ?? {
    version: 1,
    answers: { name: names.slug, pitch, preset: preset.id, modules, postgresPort, adminEmail: "" },
    done: [],
  }
  const step = (id: Step, title: string, task: () => Promise<string> | string): p.Task[] =>
    state.done.includes(id)
      ? []
      : [
          {
            title,
            task: async () => {
              const message = await task()
              markDone(target, state, id)
              return message
            },
          },
        ]
  saveState(target, state)
  const steps: p.Task[] = [
    ...step("generate", "Copying the template", () => {
      if (existsSync(join(target, ".env"))) {
        const old = readFileSync(join(target, ".env"), "utf8")
        for (const key of modules.flatMap((id) => manifest.modules[id]?.keys ?? [])) {
          const value = old.match(new RegExp(`^${key.env}=(.+)$`, "m"))?.[1]
          if (value) env[key.env] = value
        }
      }
      if (existsSync(target)) {
        for (const entry of readdirSync(target))
          if (entry !== ".findplate") rmSync(resolve(target, entry), { recursive: true, force: true })
      }
      admin = generate({
        templateDir: templateDir(),
        target,
        names,
        pitch,
        preset,
        modules: new Set(modules),
        env,
        postgresPort,
      })
      state.answers.adminEmail = admin.adminEmail
      return `Created ${bold(names.slug)} with the ${preset.label.toLowerCase()} preset`
    }),
  ]
  if (flags.agents) {
    steps.push(
      ...step("agents", "Generating agent rules", async () => {
        const result = await applyAgents(target)
        return result.ok
          ? "Agent rules written for claude, cursor, opencode, zed and oh-my-pi"
          : `Skipped agent rules (${result.reason}). Run pnpm agents later`
      }),
    )
  }
  if (canInstall) {
    steps.push(
      ...step(
        "install",
        "Installing dependencies",
        async () => (await run("pnpm", ["install"], target), "Dependencies installed"),
      ),
      ...step("format", "Formatting", async () => (await run("pnpm", ["check"], target), "Formatted with biome")),
    )
  }
  if (flags.git) {
    steps.push(
      ...step("git", "Creating the git repository", async () => {
        await run("git", ["init", "-q", "-b", "main"], target)
        await run("git", ["add", "-A"], target)
        try {
          await run("git", ["commit", "-q", "-m", "chore(repo): start from findplate"], target)
        } catch {
          return "Git repository created (set user.name and user.email to make the first commit)"
        }
        return "First commit on main"
      }),
    )
  }
  await p.tasks(steps)

  p.note(
    [
      `${accent("cd")} ${names.slug}`,
      ...(canInstall ? [] : [`${accent("pnpm")} install`]),
      `${accent("pnpm")} db:up      ${dim(`postgres on :${postgresPort}`)}`,
      `${accent("pnpm")} dev        ${dim("web :3000 · api :3001 · dashboard :3002")}`,
      "",
      `dashboard admin  ${bold(admin.adminEmail)}`,
      `password         ${dim("ADMIN_PASSWORD in .env")}`,
    ].join("\n"),
    "Next",
  )
  p.outro(`${names.title} is ready. Docs: ${accent("docs/")} in the project.`)
}
