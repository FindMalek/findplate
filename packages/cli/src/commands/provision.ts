import { basename, resolve } from "node:path"
import { parseArgs } from "node:util"
import * as p from "@clack/prompts"
import { loadConfig } from "../config"
import { planBackup } from "../provision/backup"
import { planDns } from "../provision/dns"
import { planDokploy } from "../provision/dokploy"
import { planS3 } from "../provision/s3"
import { loadDone, markTask } from "../provision/state"
import type { Ctx, Task } from "../provision/task"
import { planTurbo } from "../provision/turbo"
import { loadState } from "../state"

const PLANNERS: Record<string, (ctx: Ctx) => Task[]> = {
  dokploy: planDokploy,
  s3: planS3,
  dns: planDns,
  turbo: planTurbo,
  backup: planBackup,
}
const ALL = ["dokploy", "s3", "dns", "turbo", "backup"]

export const PROVISION_HELP = `Usage
  findplate provision <${ALL.join("|")}|all> [options]

Options
  --dry-run           print the plan, change nothing
  --domain <domain>   your domain (dns, and the production env urls)
  --repo <owner/name> github repo for secrets (default: githubOwner/<project name>)
  --envs <a,b>        environments (default: production,preview)
  --dir <path>        project directory (default: cwd)`

export function buildPlan(targets: string[], ctx: Ctx): Task[] {
  return targets.flatMap((target) => {
    const planner = PLANNERS[target]
    if (!planner) throw new Error(`Unknown target "${target}"\n\n${PROVISION_HELP}`)
    return planner(ctx)
  })
}

export async function provisionCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      domain: { type: "string" },
      repo: { type: "string" },
      envs: { type: "string", default: "production,preview" },
      dir: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  })
  if (values.help || !positionals.length) return console.info(PROVISION_HELP)
  const dir = resolve(values.dir ?? ".")
  const config = loadConfig()
  const name = loadState(dir)?.answers.name ?? basename(dir)
  const repo = values.repo ?? (config.githubOwner ? `${config.githubOwner}/${name}` : "")
  if (!repo) throw new Error("Pass --repo owner/name or run: findplate config set githubOwner <user-or-org>")
  const ctx: Ctx = {
    config,
    dir,
    name,
    repo,
    domain: values.domain,
    envs: (values.envs ?? "").split(",").filter(Boolean),
  }
  const targets = positionals[0] === "all" ? ALL : positionals
  const tasks = buildPlan(targets, ctx)

  if (values["dry-run"]) {
    for (const task of tasks) console.info(`- ${task.title}`)
    return
  }
  const done = loadDone(dir)
  for (const task of tasks) {
    if (done.includes(task.id)) {
      p.log.info(`${task.id} already done`)
      continue
    }
    p.log.step(task.title)
    await task.run()
    markTask(dir, task.id)
  }
  p.log.success("Provisioned")
}
