import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { configPath } from "./config"

const REGISTRY_URL = "https://registry.npmjs.org/findplate/latest"
const TTL_MS = 24 * 60 * 60 * 1000
const TIMEOUT_MS = 1500

interface Cache {
  checkedAt: number
  latest: string
}

export const cachePath = () => join(dirname(configPath()), "update-check.json")

export function isExpired(checkedAt: number, now: number, ttl = TTL_MS): boolean {
  return now - checkedAt >= ttl || checkedAt > now
}

const parts = (version: string) => version.split("-")[0]!.split(".").map(Number)

export function isNewer(latest: string, current: string): boolean {
  const a = parts(latest)
  const b = parts(current)
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff) return diff > 0
  }
  return false
}

export interface SkipContext {
  flag: boolean
  env: Record<string, string | undefined>
  isTTY: boolean
}

export function shouldSkip({ flag, env, isTTY }: SkipContext): boolean {
  return flag || !isTTY || Boolean(env.FINDPLATE_NO_UPDATE_CHECK) || Boolean(env.CI)
}

function readCache(file: string): Cache | undefined {
  if (!existsSync(file)) return undefined
  try {
    const cache = JSON.parse(readFileSync(file, "utf8")) as Cache
    return typeof cache.latest === "string" && typeof cache.checkedAt === "number" ? cache : undefined
  } catch {
    return undefined
  }
}

async function fetchLatest(): Promise<string | undefined> {
  const response = await fetch(REGISTRY_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) return undefined
  const body = (await response.json()) as { version?: string }
  return body.version
}

export interface CheckOptions {
  current: string
  now?: number
  file?: string
  fetchLatest?: () => Promise<string | undefined>
}

/** The newer published version, or undefined when up to date or the registry can't be reached. One GET a day at most. */
export async function checkForUpdate(opts: CheckOptions): Promise<string | undefined> {
  const { current, now = Date.now(), file = cachePath() } = opts
  try {
    let cache = readCache(file)
    if (!cache || isExpired(cache.checkedAt, now)) {
      const latest = await (opts.fetchLatest ?? fetchLatest)()
      if (!latest) return undefined
      cache = { checkedAt: now, latest }
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, `${JSON.stringify(cache)}\n`)
    }
    return isNewer(cache.latest, current) ? cache.latest : undefined
  } catch {
    return undefined
  }
}
