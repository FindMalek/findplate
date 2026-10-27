export type Status = "pass" | "warn" | "fail" | "skip"

export interface CheckResult {
  id: string
  label: string
  status: Status
  detail: string
}

const KEY = /^([A-Z][A-Z0-9_]*)=(.*)$/gm

/** KEY=value pairs of an env file; comments and blanks are ignored. */
export function parseEnv(text: string): Record<string, string> {
  return Object.fromEntries([...text.matchAll(KEY)].map((m) => [m[1]!, m[2]!.trim()]))
}

/** Keys of `.env.example` that `.env` doesn't define at all. */
export function missingKeys(example: string, env: string): string[] {
  const have = parseEnv(env)
  return Object.keys(parseEnv(example)).filter((key) => !(key in have))
}

/** Keys the zod schema requires: declared as `KEY: z...` without `.optional()` or `.default(`. */
export function requiredKeys(schemaSource: string): string[] {
  const keys: string[] = []
  for (const line of schemaSource.split("\n")) {
    const match = line.match(/^\s+([A-Z][A-Z0-9_]*):\s*z\./)
    if (match && !/\.(optional|default|prefault)\(/.test(line)) keys.push(match[1]!)
  }
  return keys
}

export function emptyRequired(required: string[], env: Record<string, string>): string[] {
  return required.filter((key) => !env[key])
}

/** True when `have` ("v22.1.0", "10.2") is at least `min` ("20", "10.0.0"). */
export function atLeast(have: string, min: string): boolean {
  const parts = (v: string) =>
    v
      .replace(/^[^\d]*/, "")
      .split(".")
      .map((n) => Number.parseInt(n, 10) || 0)
  const [a, b] = [parts(have), parts(min)]
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const [x, y] = [a[i] ?? 0, b[i] ?? 0]
    if (x !== y) return x > y
  }
  return true
}

export function hostPort(url: string): { host: string; port: number } | undefined {
  try {
    const parsed = new URL(url)
    const port = parsed.port ? Number(parsed.port) : parsed.protocol.startsWith("postgres") ? 5432 : 0
    return port ? { host: parsed.hostname, port } : undefined
  } catch {
    return undefined
  }
}

export const isLocalHost = (host: string) => host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")

export const exitCode = (results: CheckResult[]) => (results.some((r) => r.status === "fail") ? 1 : 0)

const MARK: Record<Status, string> = { pass: "PASS", warn: "WARN", fail: "FAIL", skip: "SKIP" }

export function renderTable(results: CheckResult[]): string {
  const width = Math.max(...results.map((r) => r.label.length))
  const rows = results.map((r) => `${MARK[r.status]}  ${r.label.padEnd(width)}  ${r.detail}`)
  const count = (status: Status) => results.filter((r) => r.status === status).length
  return `${rows.join("\n")}\n\n${count("pass")} passed, ${count("warn")} warnings, ${count("fail")} failed`
}
