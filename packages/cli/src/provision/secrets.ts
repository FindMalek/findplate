import { spawnSync } from "node:child_process"
import * as p from "@clack/prompts"

const prompted = new Map<string, string>()

export async function secret(envName: string, label: string): Promise<string> {
  const known = process.env[envName] ?? prompted.get(envName)
  if (known) return known
  if (!process.stdin.isTTY) throw new Error(`Set ${envName} in the environment (${label})`)
  const value = await p.password({ message: `${label} (${envName})` })
  if (p.isCancel(value) || !value) throw new Error(`${envName} is required`)
  prompted.set(envName, value)
  return value
}

/** Values go through stdin, so they never show up in argv or logs. */
export function ghSet(kind: "secret" | "variable", repo: string, name: string, value: string) {
  const res = spawnSync("gh", [kind, "set", name, "--repo", repo], { input: value, encoding: "utf8" })
  if (res.status !== 0) throw new Error(`gh ${kind} set ${name} failed: ${res.stderr.trim() || res.error?.message}`)
}
