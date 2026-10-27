import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

export const CONFIG_KEYS = {
  dokployUrl: "Dokploy instance URL",
  dnsProvider: "DNS provider (vercel or cloudflare)",
  s3Endpoint: "S3 endpoint",
  turboCache: "Turborepo remote cache URL",
  githubOwner: "GitHub user or org for new repos",
} as const

export type ConfigKey = keyof typeof CONFIG_KEYS
export type Config = Partial<Record<ConfigKey, string>>

export const isConfigKey = (key: string): key is ConfigKey => key in CONFIG_KEYS

export function configPath(): string {
  const base =
    process.env.FINDPLATE_CONFIG_DIR ?? join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "findplate")
  return join(base, "config.json")
}

export function loadConfig(file = configPath()): Config {
  if (!existsSync(file)) return {}
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Config
  } catch {
    throw new Error(`${file} isn't valid JSON, fix or delete it`)
  }
}

export function saveConfig(config: Config, file = configPath()) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`)
  chmodSync(file, 0o600)
}

export function setConfig(key: ConfigKey, value: string, file = configPath()): Config {
  const next = { ...loadConfig(file) }
  if (value) next[key] = value
  else delete next[key]
  saveConfig(next, file)
  return next
}
