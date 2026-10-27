import { existsSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import * as p from "@clack/prompts"
import { generate } from "../generate"
import { isValidSlug, toNames } from "../generate/rename"
import { loadManifest } from "../manifest"
import { templateDir } from "../paths"
import { listPresets } from "../presets"
import { freePort, has, run } from "../run"
import { accent, bold, brand, dim } from "../ui"

export interface CreateFlags {
  dir?: string
  name?: string
  pitch?: string
  preset?: string
  modules?: string
  install: boolean
  git: boolean
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
  const interactive = !flags.yes && process.stdin.isTTY

  p.intro(`${brand("findplate")} ${dim("a full-stack project, set up in one go")}`)

  let name = flags.name ?? flags.dir
  if (!name) {
    if (!interactive) throw new Error("--name is required with --yes")
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
  if (existsSync(target) && readdirSync(target).length) throw new Error(`${target} already exists and isn't empty`)

  let pitch = flags.pitch
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

  let presetId = flags.preset
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
  if (flags.modules !== undefined) {
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

  const postgresPort = await freePort(5432)
  const canInstall = flags.install && (await has("pnpm"))
  const steps: p.Task[] = [
    {
      title: "Copying the template",
      task: () => {
        const result = generate({
          templateDir: templateDir(),
          target,
          names,
          pitch,
          preset,
          modules: new Set(modules),
          env,
          postgresPort,
        })
        Object.assign(admin, result)
        return `Created ${bold(names.slug)} with the ${preset.label.toLowerCase()} preset`
      },
    },
  ]
  const admin = { adminEmail: "", adminPassword: "" }
  if (canInstall) {
    steps.push(
      {
        title: "Installing dependencies",
        task: async () => (await run("pnpm", ["install"], target), "Dependencies installed"),
      },
      { title: "Formatting", task: async () => (await run("pnpm", ["check"], target), "Formatted with biome") },
    )
  }
  if (flags.git) {
    steps.push({
      title: "Creating the git repository",
      task: async () => {
        await run("git", ["init", "-q", "-b", "main"], target)
        await run("git", ["add", "-A"], target)
        await run("git", ["commit", "-q", "-m", "chore(repo): start from findplate"], target)
        return "First commit on main"
      },
    })
  }
  await p.tasks(steps)

  p.note(
    [
      `${accent("cd")} ${names.slug}`,
      ...(canInstall ? [] : [`${accent("pnpm")} install`]),
      `${accent("pnpm")} db:up      ${dim(`postgres on :${postgresPort}`)}`,
      `${accent("pnpm")} dev        ${dim("web :3000 · api :3001 · dashboard :3002")}`,
      "",
      `dashboard admin  ${bold(admin.adminEmail.replace(/^admin@.*$/, "see ADMIN_EMAIL in .env"))}`,
      `password         ${dim("ADMIN_PASSWORD in .env")}`,
    ].join("\n"),
    "Next",
  )
  p.outro(`${names.title} is ready. Docs: ${accent("docs/")} in the project.`)
}
