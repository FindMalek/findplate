#!/usr/bin/env node
import { parseArgs } from "node:util"
import * as p from "@clack/prompts"
import pkg from "../package.json"
import { configCommand } from "./commands/config"
import { create } from "./commands/create"

const VERSION = pkg.version

const HELP = `findplate: create a production-ready full-stack project

Usage
  findplate create [dir] [options]   re-run in an unfinished project to resume it
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
  -y, --yes           no prompts, use defaults (for scripts and coding agents)
  -h, --help           show this help
  -v, --version        show the version`

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
      yes: { type: "boolean", short: "y", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
  })
  if (values.version) return console.info(VERSION)
  const [command = "create", dir] = positionals
  if (values.help) return console.info(HELP)
  if (command === "config") return configCommand(positionals.slice(1))
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
    yes: values.yes,
  })
}

main().catch((error: Error) => {
  p.log.error(error.message)
  process.exit(1)
})
