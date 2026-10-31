import { spawn } from "node:child_process"
import { createInterface } from "node:readline"
import pkg from "../../package.json"

type Json = Record<string, unknown>

interface Tool {
  name: string
  description: string
  properties: Record<string, Json>
  required?: string[]
  /** The cli arguments for one call. */
  args: (input: Json) => string[]
}

export interface RunResult {
  code: number
  stdout: string
  stderr: string
}
export type Runner = (args: string[]) => Promise<RunResult>

const str = (description: string) => ({ type: "string", description })
const bool = (description: string) => ({ type: "boolean", description })
const list = (description: string) => ({ type: "array", items: { type: "string" }, description })

const flag = (input: Json, key: string, name = key) => (input[key] === true ? [`--${name}`] : [])
const value = (input: Json, key: string, name = key) =>
  typeof input[key] === "string" && input[key] ? [`--${name}`, input[key] as string] : []
const modules = (input: Json) => (Array.isArray(input.modules) ? (input.modules as string[]) : [])
const dir = (input: Json) => (typeof input.dir === "string" && input.dir ? [input.dir] : [])

export const TOOLS: Tool[] = [
  {
    name: "create",
    description:
      "Generate a findplate project. Set plan to true to only list what would be generated (json), nothing is written.",
    properties: {
      dir: str("target directory"),
      name: str("project name"),
      pitch: str("one-line pitch"),
      preset: str("design preset"),
      profile: str("minimal, standard or everything"),
      modules: str("comma separated modules, wins over profile"),
      plan: bool("print the plan as json and write nothing"),
      install: bool("run pnpm install (default false)"),
      git: bool("init a git repository (default false)"),
    },
    required: ["dir"],
    args: (input) => [
      "create",
      ...dir(input),
      ...value(input, "name"),
      ...value(input, "pitch"),
      ...value(input, "preset"),
      ...value(input, "profile"),
      ...(typeof input.modules === "string" ? ["--modules", input.modules] : []),
      ...(input.plan === true ? ["--plan", "--json"] : ["--yes", "--no-agents", "--no-skills"]),
      ...(input.install === true ? [] : ["--no-install"]),
      ...(input.git === true ? [] : ["--no-git"]),
    ],
  },
  {
    name: "add",
    description: "Add modules to an existing findplate project.",
    properties: { modules: list("modules to add"), dir: str("project directory"), force: bool("allow a dirty tree") },
    required: ["modules"],
    args: (input) => ["add", ...modules(input), ...dir(input), "--yes", "--no-install", ...flag(input, "force")],
  },
  {
    name: "remove",
    description: "Remove modules from an existing findplate project.",
    properties: {
      modules: list("modules to remove"),
      dir: str("project directory"),
      force: bool("allow a dirty tree"),
      dryRun: bool("print what would change"),
    },
    required: ["modules"],
    args: (input) => [
      "remove",
      ...modules(input),
      ...dir(input),
      ...flag(input, "force"),
      ...flag(input, "dryRun", "dry-run"),
    ],
  },
  {
    name: "update",
    description: "Merge the newest template into an existing project.",
    properties: {
      dir: str("project directory"),
      force: bool("allow a dirty tree"),
      dryRun: bool("list the changes and diffs, write nothing"),
    },
    args: (input) => ["update", ...dir(input), ...flag(input, "force"), ...flag(input, "dryRun", "dry-run")],
  },
  {
    name: "doctor",
    description: "Check a project: env, database, tools, and with security the security checks. Returns json.",
    properties: { dir: str("project directory"), security: bool("only the security checks") },
    args: (input) => ["doctor", ...dir(input), "--json", ...flag(input, "security")],
  },
]

/** Runs this same cli in a child process, so a failing command can't take the server down. */
export const spawnCli: Runner = (args) =>
  new Promise((done) => {
    const child = spawn(process.execPath, [process.argv[1] as string, ...args, "--no-update-check"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("error", (error) => done({ code: 1, stdout, stderr: error.message }))
    child.on("close", (code) => done({ code: code ?? 1, stdout, stderr }))
  })

const reply = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result })
const fail = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } })

/** One json-rpc message in, the response out; notifications give undefined. */
export async function handle(message: Json, run: Runner = spawnCli): Promise<Json | undefined> {
  const { id, method } = message as { id?: unknown; method?: string }
  if (id === undefined) return undefined
  if (method === "initialize") {
    return reply(id, {
      protocolVersion: (message.params as Json | undefined)?.protocolVersion ?? "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "findplate", version: pkg.version },
    })
  }
  if (method === "ping") return reply(id, {})
  if (method === "tools/list") {
    return reply(id, {
      tools: TOOLS.map(({ name, description, properties, required }) => ({
        name,
        description,
        inputSchema: { type: "object", properties, required: required ?? [] },
      })),
    })
  }
  if (method === "tools/call") {
    const params = (message.params ?? {}) as { name?: string; arguments?: Json }
    const tool = TOOLS.find((candidate) => candidate.name === params.name)
    if (!tool) return fail(id, -32602, `Unknown tool "${params.name}"`)
    const result = await run(tool.args(params.arguments ?? {}))
    const text = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n") || `exit code ${result.code}`
    return reply(id, { content: [{ type: "text", text }], isError: result.code !== 0 })
  }
  return fail(id, -32601, `Method not found: ${method}`)
}

/** Newline delimited json-rpc over stdio, the transport MCP clients spawn servers with. */
export function mcpCommand(): Promise<void> {
  const lines = createInterface({ input: process.stdin })
  const pending = new Set<Promise<void>>()
  lines.on("line", (line) => {
    if (!line.trim()) return
    const task = (async () => {
      let response: Json | undefined
      try {
        response = await handle(JSON.parse(line) as Json)
      } catch (error) {
        response = fail(null, -32700, (error as Error).message)
      }
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`)
    })().finally(() => pending.delete(task))
    pending.add(task)
  })
  return new Promise((done) => lines.on("close", () => void Promise.all(pending).then(() => done())))
}
