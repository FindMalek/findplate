#!/usr/bin/env node
import { parseArgs } from "node:util"
import * as p from "@clack/prompts"
import pkg from "../package.json"
import { configCommand } from "./commands/config"
import { create } from "./commands/create"
import { github } from "./commands/github"

const VERSION = pkg.version

const HELP = `findplate: create a production-ready full-stack project

Usage
  findplate create [dir] [options]   re-run in an unfinished project to resume it
  findplate github [dir] [options]   create the repo, board, labels and rules on GitHub (idempotent)
  findplate config [list|get|set|unset|path] [key] [value]

Options
  --name <name>        project name (defaults to dir)
  --pitch <text>       one-line pitch for the landing page
  --preset <id>        design preset (monochrome, …)
  --modules <a,b>      optional modules to include (storage, ai); empty for none
  --no-install         skip pnpm install
  --no-git             skip git init
  --no-agents          skip generating agent rules (ruler)
  --no-skills          skip installing the recommended public skills
  --github / --no-github  create the GitHub repo and board after the first commit
  -y, --yes            no prompts, use defaults (for scripts and coding agents)
  -h, --help           show this help
  -v, --version        show the version

GitHub options (findplate github)
  --dry-run            print the plan, change nothing
  --owner <name>       user or org (defaults to config githubOwner, then your gh login)
  --public             public repo (default private)
  --homepage <url>     repo homepage
  --no-project         skip the project board
  --project-template <owner/number>
                       copy this project as the board instead of building the Status column`

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    allowNegative: true,
    options: {
      name: { type: "string" },
      pitch: { type: "string" },
      preset: { type: "string" },
      modules: { type: "string" },
      install: { type: "boolean", default: true },
      git: { type: "boolean", default: true },
      agents: { type: "boolean", default: true },
      skills: { type: "boolean", default: true },
      github: { type: "boolean" },
      owner: { type: "string" },
      homepage: { type: "string" },
      public: { type: "boolean", default: false },
      project: { type: "boolean", default: true },
      "project-template": { type: "string" },
      "dry-run": { type: "boolean", default: false },
      yes: { type: "boolean", short: "y", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
  })
  if (values.version) return console.info(VERSION)
  const [command = "create", dir] = positionals
  if (values.help) return console.info(HELP)
  if (command === "config") return configCommand(positionals.slice(1))
  if (command === "github") {
    return github({
      dir,
      owner: values.owner,
      homepage: values.homepage,
      public: values.public,
      project: values.project,
      projectTemplate: values["project-template"],
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
    yes: values.yes,
  })
}

main().catch((error: Error) => {
  p.log.error(error.message)
  process.exit(1)
})
