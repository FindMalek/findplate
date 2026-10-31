#!/usr/bin/env node
import { parseArgs } from "node:util"
import * as p from "@clack/prompts"
import pkg from "../package.json"
import { addCommand } from "./commands/add"
import { configCommand } from "./commands/config"
import { create } from "./commands/create"
import { diffCommand } from "./commands/diff"
import { doctorCommand } from "./commands/doctor"
import { github } from "./commands/github"
import { provisionCommand } from "./commands/provision"
import { removeCommand } from "./commands/remove"
import { update } from "./commands/update"
import { CliError, EXIT } from "./errors"
import { accent, dim } from "./ui"
import { checkForUpdate, shouldSkip } from "./update-check"

const VERSION = pkg.version

const HELP = `findplate: create a production-ready full-stack project

Usage
  findplate create [dir] [options]   re-run in an unfinished project to resume it
  findplate github [dir] [options]   create the repo, board, labels and rules on GitHub (idempotent)
  findplate update [dir] [options]   merge the newest template into an existing project
  findplate diff [dir] [--base-template <dir>]   show how the project differs from the template it was generated from
  findplate add <module...> [dir] [--force]   add modules to an existing project
  findplate remove <module...> [dir] [--force] [--dry-run]   remove modules from a project
  findplate doctor [dir] [--json] [--security]   check env, database, tools, dns and deploys
  findplate config [list|get|set|unset|path] [key] [value]
  findplate provision <dokploy|s3|dns|turbo|backup|all> [--dry-run]   see provision --help

Options
  --name <name>        project name (defaults to dir)
  --pitch <text>       one-line pitch for the landing page
  --preset <id>        design preset (monochrome, …)
  --profile <id>       minimal, standard or everything (default with -y: standard)
  --modules <a,b>      exact modules to include, wins over --profile; empty for none
  --no-install         skip pnpm install
  --no-git             skip git init
  --no-agents          skip generating agent rules (ruler)
  --no-skills          skip installing the recommended public skills
  --no-update-check    skip the once-a-day check for a newer findplate (or set FINDPLATE_NO_UPDATE_CHECK)
  --github / --no-github  create the GitHub repo and board after the first commit
  -y, --yes            no prompts, use defaults (for scripts and coding agents)
  -h, --help           show this help
  -v, --version        show the version

Remove options (findplate remove)
  --dry-run            print what would change, touch nothing
  --force              remove with uncommitted changes and delete module files you edited
  --drop-migrations    also delete the module's drizzle migration (only if it never ran)

Update options (findplate update)
  --dry-run            print what would change, touch nothing
  --force              update even with uncommitted changes
  --base-template <dir>  template of the recorded version, instead of downloading it

GitHub options (findplate github)
  --dry-run            print the plan, change nothing
  --owner <name>       user or org (defaults to config githubOwner, then your gh login)
  --public             public repo (default private)
  --homepage <url>     repo homepage
  --no-project         skip the project board
  --project-token      store your gh token as the PROJECT_TOKEN secret (a scoped pat is safer)
  --project-template <owner/number>
                       copy this project as the board instead of building the Status column`

async function main() {
  if (process.argv[2] === "provision") return provisionCommand(process.argv.slice(3))
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    allowNegative: true,
    options: {
      name: { type: "string" },
      pitch: { type: "string" },
      preset: { type: "string" },
      modules: { type: "string" },
      profile: { type: "string" },
      install: { type: "boolean", default: true },
      git: { type: "boolean", default: true },
      agents: { type: "boolean", default: true },
      skills: { type: "boolean", default: true },
      "update-check": { type: "boolean", default: true },
      github: { type: "boolean" },
      owner: { type: "string" },
      homepage: { type: "string" },
      public: { type: "boolean", default: false },
      project: { type: "boolean", default: true },
      "project-token": { type: "boolean", default: false },
      "project-template": { type: "string" },
      force: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      security: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      "base-template": { type: "string" },
      "drop-migrations": { type: "boolean", default: false },
      yes: { type: "boolean", short: "y", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
  })
  if (values.version) return console.info(VERSION)
  const [command = "create", dir] = positionals
  if (values.help) return console.info(HELP)
  if (command === "diff") return diffCommand({ dir, baseTemplate: values["base-template"] })
  if (command === "update") {
    return update({
      dir,
      force: values.force,
      dryRun: values["dry-run"],
      baseTemplate: values["base-template"],
      version: VERSION,
    })
  }
  const skip = shouldSkip({ flag: !values["update-check"], env: process.env, isTTY: Boolean(process.stderr.isTTY) })
  const latest = skip ? undefined : await checkForUpdate({ current: VERSION })
  if (latest) {
    console.error(`${dim(`findplate ${VERSION} is behind ${latest}. Run`)} ${accent("npx findplate@latest")}\n`)
  }
  if (command === "doctor") return doctorCommand({ dir, json: values.json, security: values.security })
  if (command === "add") {
    const args = positionals.slice(1)
    const dirArg = args.find((arg) => arg.includes("/") || arg === ".")
    return addCommand({
      dir: dirArg,
      modules: args.filter((arg) => arg !== dirArg).flatMap((arg) => arg.split(",")),
      install: values.install,
      force: values.force,
      yes: values.yes,
    })
  }
  if (command === "remove") {
    const args = positionals.slice(1)
    const dirArg = args.find((arg) => arg.includes("/") || arg === ".")
    return removeCommand({
      dir: dirArg,
      modules: args.filter((arg) => arg !== dirArg).flatMap((arg) => arg.split(",")),
      force: values.force,
      dryRun: values["dry-run"],
      dropMigrations: values["drop-migrations"],
    })
  }
  if (command === "config") return configCommand(positionals.slice(1))
  if (command === "github") {
    return github({
      dir,
      owner: values.owner,
      homepage: values.homepage,
      public: values.public,
      project: values.project,
      projectTemplate: values["project-template"],
      projectToken: values["project-token"],
      dryRun: values["dry-run"],
    })
  }
  if (command !== "create") {
    console.error(`Unknown command "${command}"\n\n${HELP}`)
    process.exit(1)
  }
  await create({
    dir,
    name: values.name,
    pitch: values.pitch,
    preset: values.preset,
    modules: values.modules,
    profile: values.profile,
    install: values.install,
    git: values.git,
    agents: values.agents,
    skills: values.skills,
    github: values.github,
    owner: values.owner,
    homepage: values.homepage,
    public: values.public,
    project: values.project,
    projectTemplate: values["project-template"],
    projectToken: values["project-token"],
    yes: values.yes,
  })
}

main().catch((error: Error) => {
  p.log.error(error.message)
  process.exit(error instanceof CliError ? error.code : EXIT.failure)
})
