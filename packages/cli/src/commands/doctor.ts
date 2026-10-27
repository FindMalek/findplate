import { lookup } from "node:dns/promises"
import { existsSync, readFileSync } from "node:fs"
import { createConnection } from "node:net"
import { join, resolve } from "node:path"
import { loadConfig } from "../config"
import {
  atLeast,
  type CheckResult,
  emptyRequired,
  exitCode,
  hostPort,
  isLocalHost,
  missingKeys,
  parseEnv,
  renderTable,
  requiredKeys,
  type Status,
} from "../doctor-plan"
import { CliError, EXIT } from "../errors"
import { capture } from "../git"
import { loadDone } from "../provision/state"
import { loadState } from "../state"

export interface DoctorFlags {
  dir?: string
  json: boolean
}

const read = (file: string) => (existsSync(file) ? readFileSync(file, "utf8") : undefined)

function reachable(host: string, port: number): Promise<boolean> {
  return new Promise((done) => {
    const socket = createConnection({ host, port, timeout: 2000 })
    socket.once("connect", () => (socket.destroy(), done(true)))
    socket.once("error", () => done(false))
    socket.once("timeout", () => (socket.destroy(), done(false)))
  })
}

const result = (id: string, label: string, status: Status, detail: string): CheckResult => ({
  id,
  label,
  status,
  detail,
})

export async function runChecks(dir: string): Promise<CheckResult[]> {
  const out: CheckResult[] = []
  const state = loadState(dir)
  out.push(
    state
      ? result(
          "project",
          "project",
          "pass",
          `${state.answers.name}, modules: ${state.answers.modules.join(", ") || "none"}`,
        )
      : result("project", "project", "fail", "no .findplate/state.json, is this a findplate project?"),
  )

  const example = read(join(dir, ".env.example"))
  const envText = read(join(dir, ".env"))
  const env = parseEnv(envText ?? "")
  if (envText === undefined) out.push(result("env-file", ".env", "fail", "missing, copy .env.example to .env"))
  else {
    const missing = example ? missingKeys(example, envText) : []
    out.push(
      missing.length
        ? result("env-file", ".env keys", "warn", `missing from .env: ${missing.join(", ")}`)
        : result("env-file", ".env keys", "pass", "every key of .env.example is set"),
    )
    const schema = ["api.ts", "next.ts"].map((f) => read(join(dir, "packages/env/src", f)) ?? "").join("\n")
    const empty = emptyRequired(requiredKeys(schema), env)
    out.push(
      empty.length
        ? result("env-schema", "env schema", "fail", `required but empty: ${empty.join(", ")}`)
        : result("env-schema", "env schema", "pass", "required variables are set"),
    )
  }

  const target = hostPort(env.DATABASE_URL ?? "")
  if (!target) out.push(result("db", "database", "skip", "no DATABASE_URL"))
  else {
    const up = await reachable(target.host, target.port)
    out.push(
      up
        ? result("db", "database", "pass", `${target.host}:${target.port} accepts connections`)
        : result("db", "database", "fail", `${target.host}:${target.port} unreachable, try pnpm db:up`),
    )
    const compose = Number(env.POSTGRES_PORT)
    if (compose && isLocalHost(target.host) && compose !== target.port) {
      out.push(result("ports", "compose port", "fail", `POSTGRES_PORT=${compose} but DATABASE_URL uses ${target.port}`))
    } else out.push(result("ports", "compose port", "pass", "POSTGRES_PORT matches DATABASE_URL"))
  }

  const git = await capture("git", ["--version"], dir)
  out.push(git ? result("git", "git", "pass", git) : result("git", "git", "fail", "not installed"))
  const gh = await capture("gh", ["auth", "status"], dir)
  out.push(
    gh !== undefined
      ? result("gh", "gh auth", "pass", "logged in")
      : result("gh", "gh auth", "warn", "run gh auth login"),
  )

  const pkg = JSON.parse(read(join(dir, "package.json")) ?? "{}") as { engines?: { node?: string } }
  const node = process.version
  const minNode = pkg.engines?.node?.match(/\d+(\.\d+)*/)?.[0] ?? "20"
  out.push(
    atLeast(node, minNode)
      ? result("node", "node", "pass", node)
      : result("node", "node", "fail", `${node}, needs ${minNode} or newer`),
  )
  for (const tool of ["pnpm", "bun"]) {
    const version = await capture(tool, ["--version"], dir)
    out.push(
      version
        ? result(tool, tool, "pass", version)
        : result(tool, tool, tool === "pnpm" ? "fail" : "warn", "not installed"),
    )
  }

  if (loadDone(dir).includes("dns")) {
    for (const key of ["WEB_URL", "DASHBOARD_URL", "API_PUBLIC_URL"]) {
      const host = env[key] ? new URL(env[key]).hostname : ""
      if (!host || isLocalHost(host)) continue
      const ok = await lookup(host).then(
        () => true,
        () => false,
      )
      out.push(
        ok
          ? result(`dns-${key}`, `dns ${host}`, "pass", "resolves")
          : result(`dns-${key}`, `dns ${host}`, "fail", "does not resolve"),
      )
    }
  } else out.push(result("dns", "dns", "skip", "not provisioned"))

  const dokploy = loadConfig().dokployUrl
  if (dokploy) {
    const ok = await fetch(dokploy, { method: "HEAD", signal: AbortSignal.timeout(4000) }).then(
      (r) => r.status < 500,
      () => false,
    )
    out.push(
      ok
        ? result("dokploy", "dokploy", "pass", `${dokploy} is up`)
        : result("dokploy", "dokploy", "warn", `${dokploy} unreachable`),
    )
  } else out.push(result("dokploy", "dokploy", "skip", "dokployUrl not configured"))
  out.push(
    existsSync(join(dir, ".vercel/project.json"))
      ? result("vercel", "vercel", "pass", "project linked")
      : result("vercel", "vercel", "skip", "not linked"),
  )
  return out
}

export async function doctorCommand(flags: DoctorFlags) {
  const dir = resolve(flags.dir ?? ".")
  if (!existsSync(dir)) throw new CliError(`${dir} doesn't exist`, EXIT.usage)
  const results = await runChecks(dir)
  console.info(flags.json ? JSON.stringify({ ok: exitCode(results) === 0, results }, null, 2) : renderTable(results))
  process.exitCode = exitCode(results)
}
