import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"
import * as p from "@clack/prompts"
import pkg from "../../package.json"
import { applyAgents } from "../agents"
import { CliError, EXIT } from "../errors"
import { generate } from "../generate"
import { isValidSlug, toNames } from "../generate/rename"
import { initRepo } from "../git"
import { loadManifest, type Manifest, PROFILE_IDS, type ProfileId } from "../manifest"
import { templateDir } from "../paths"
import { detectPackageManager, installCommand, pnpmHint, scriptCommand } from "../pm"
import { listPresets } from "../presets"
import {
  expandRequires,
  groupModules,
  needsFor,
  PROFILE_INFO,
  pendingKeys,
  pickModules,
  profileModules,
  renderNeeds,
} from "../profiles"
import { freePort, has, run } from "../run"
import { installSkills, SKILLS_PACKAGE, skillPacks } from "../skills"
import { loadState, markDone, type ProjectState, type Step, saveState } from "../state"
import { runTasks } from "../tasks"
import { accent, bold, brand, dim } from "../ui"
import { TEMPLATE_VERSION } from "../version"
import { ghLogin, provision } from "./github"

export interface CreateFlags {
  dir?: string
  name?: string
  pitch?: string
  preset?: string
  modules?: string
  profile?: string
  install: boolean
  git: boolean
  agents: boolean
  skills: boolean
  /** undefined asks when interactive and skips otherwise. */
  github?: boolean
  owner?: string
  homepage?: string
  public?: boolean
  project?: boolean
  projectToken?: boolean
  projectTemplate?: string
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

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x))

/** Profile first, then a grouped checklist pre-ticked from it. */
async function chooseModules(manifest: Manifest, preset?: string): Promise<{ modules: string[]; profile: string }> {
  let start: string = preset ?? "standard"
  if (!preset) {
    start = answered(
      await p.select({
        message: "Profile",
        options: [
          ...PROFILE_IDS.map((id) => ({
            value: id,
            label: PROFILE_INFO[id].label,
            hint: PROFILE_INFO[id].description,
          })),
          { value: "custom", label: "Custom", hint: "start from standard and pick by hand" },
        ],
        initialValue: "standard",
      }),
    )
  }
  const from = start === "custom" ? "standard" : start
  const base = pickModules(manifest, { profile: from }).modules
  p.log.info(`${PROFILE_INFO[from as ProfileId].label} picks ${base.join(", ") || "no modules"}`)
  const picked = answered(
    await p.groupMultiselect({
      message: "Modules (space toggles, enter confirms)",
      options: Object.fromEntries(
        groupModules(manifest).map((group) => [
          group.label,
          group.modules.map((id) => {
            const spec = manifest.modules[id]!
            return { value: id, label: spec.label, hint: spec.hint }
          }),
        ]),
      ),
      initialValues: base,
      required: false,
    }),
  )
  const { modules, added } = expandRequires(manifest, picked)
  for (const { id, by } of added)
    p.log.info(`${manifest.modules[by]?.label} needs ${manifest.modules[id]?.label}, added it`)
  const profile = PROFILE_IDS.find((id) => sameSet(profileModules(manifest, id), modules)) ?? "custom"
  return { modules, profile }
}

export async function create(flags: CreateFlags) {
  const manifest = loadManifest()
  const presets = listPresets()
  const canPrompt = !flags.yes && process.stdin.isTTY

  p.intro(`${brand("findplate")} ${dim("a full-stack project, set up in one go")}`)

  let name = flags.name ?? flags.dir
  if (!name) {
    if (!canPrompt) throw new CliError("--name is required when there is no terminal or --yes is set", EXIT.usage)
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
  let profile: string
  if (previous) {
    modules = previous.answers.modules
    profile = previous.answers.profile ?? "custom"
  } else if (interactive && flags.modules === undefined) {
    ;({ modules, profile } = await chooseModules(manifest, flags.profile))
  } else {
    const picked = pickModules(manifest, flags)
    ;({ modules, profile } = picked)
  }

  const env: Record<string, string> = {}
  const needs = needsFor(manifest, modules)
  if (interactive) {
    if (needs.length) p.note(renderNeeds(needs), "Keys you will need")
    for (const { key } of needs) {
      if (!key) continue
      const answer = answered(await p.password({ message: `${key.label} ${dim(`(optional, ${key.url})`)}`, mask: "•" }))
      if (answer) env[key.env] = answer
    }
  }

  let wantGithub = flags.github ?? false
  if (flags.github === undefined && interactive && flags.git && (await ghLogin())) {
    wantGithub = answered(await p.confirm({ message: "Create the GitHub repo, board and rules?", initialValue: false }))
  }

  const postgresPort = previous?.answers.postgresPort ?? (await freePort(5432))
  const hasPnpm = await has("pnpm")
  const canInstall = flags.install && hasPnpm
  const pm = detectPackageManager()
  let admin = { adminEmail: previous?.answers.adminEmail ?? "", adminPassword: "" }
  const state: ProjectState = previous ?? {
    version: 1,
    cliVersion: pkg.version,
    templateVersion: TEMPLATE_VERSION,
    answers: { name: names.slug, pitch, preset: preset.id, profile, modules, postgresPort, adminEmail: "" },
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
        runner: (script) => scriptCommand(pm, script),
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
  if (flags.skills) {
    steps.push(
      ...step("skills", "Installing agent skills", async () => {
        const result = await installSkills(target, skillPacks(manifest, modules))
        return result.ok
          ? `${result.installed} skill packs installed`
          : `Some skills were skipped (${result.reason}). Run npx ${SKILLS_PACKAGE} add <repo> later`
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
      ...step("git", "Creating the git repository", () => initRepo(target, () => markDone(target, state, "git"))),
    )
  }
  if (wantGithub && flags.git) {
    steps.push(
      ...step("github", "Setting up GitHub", async () => {
        if (!existsSync(join(target, ".git"))) return "Skipped GitHub, no git repository was created here"
        const outcomes = await provision(target, state, {
          dir: target,
          owner: flags.owner,
          homepage: flags.homepage,
          public: flags.public,
          project: flags.project ?? true,
          projectToken: flags.projectToken,
          projectTemplate: flags.projectTemplate,
          dryRun: false,
        })
        const failed = outcomes.filter((outcome) => outcome.status === "failed")
        if (failed.length) {
          const what = failed.map((outcome) => `${outcome.title}: ${outcome.error}`).join("; ")
          return `GitHub setup incomplete (${what}). Run findplate github to retry`
        }
        return "GitHub repo, board and rules ready"
      }),
    )
  }
  await runTasks(steps)

  const pending = pendingKeys(manifest, modules, env)
  p.note(
    [
      `${accent("cd")} ${names.slug}`,
      ...(canInstall ? [] : [accent(installCommand(pm))]),
      `${accent(scriptCommand(pm, "db:up"))}  ${dim(`postgres on :${postgresPort}`)}`,
      `${accent(scriptCommand(pm, "dev"))}  ${dim("web :3000 · api :3001 · dashboard :3002")}`,
      ...(modules.includes("notification")
        ? [`${accent(scriptCommand(pm, "dev:email"))}  ${dim("email previews :3004")}`]
        : []),
      "",
      `dashboard admin  ${bold(admin.adminEmail)}`,
      `password         ${dim("ADMIN_PASSWORD in .env")}`,
      ...(pending.length ? ["", bold("Still to set in .env"), renderNeeds(pending)] : []),
    ].join("\n"),
    "Next",
  )
  const hint = pnpmHint(hasPnpm)
  if (hint) p.log.warn(hint)
  p.outro(`${names.title} is ready. Docs: ${accent("docs/")} in the project.`)
}
