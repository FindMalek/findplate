import { spawn } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import * as p from "@clack/prompts"
import { spawnPlan } from "../platform"
import { has, run } from "../run"
import { accent, dim } from "../ui"
import { type CreateFlags, create } from "./create"

/** A sample project with the default modules, no git, agents or skills. */
export function demoFlags(dir?: string): CreateFlags {
  return {
    dir: dir ?? join(tmpdir(), "findplate-demo"),
    name: "demo",
    pitch: "A findplate sample project",
    profile: "standard",
    install: true,
    git: false,
    agents: false,
    skills: false,
    github: false,
    yes: true,
  }
}

/** Generates a sample project, starts its database when docker is there, then runs it. */
export async function demoCommand(flags: { dir?: string }) {
  const options = demoFlags(flags.dir)
  const dir = options.dir as string
  await create(options)
  if (!(await has("docker"))) {
    p.log.warn(
      `docker is missing, so the database can't start. Install it, then run ${accent("pnpm db:up && pnpm dev")} in ${dir}`,
    )
    return
  }
  await run("pnpm", ["db:up"], dir)
  p.log.info(`${dim("web http://localhost:3000, dashboard http://localhost:3002. ctrl+c to stop")}`)
  const plan = spawnPlan("pnpm", ["dev"])
  const child = spawn(plan.cmd, plan.args, { cwd: dir, shell: plan.shell, stdio: "inherit" })
  await new Promise<void>((resolve) => child.on("close", () => resolve()))
}
