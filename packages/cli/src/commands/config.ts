import * as p from "@clack/prompts"
import { CONFIG_KEYS, configPath, isConfigKey, loadConfig, setConfig } from "../config"

export function configCommand(args: string[]) {
  const [action = "list", key, ...rest] = args
  if (action === "path") return console.info(configPath())
  if (action === "list") {
    const config = loadConfig()
    for (const [id, label] of Object.entries(CONFIG_KEYS)) {
      console.info(`${id.padEnd(12)} ${config[id as keyof typeof config] ?? "(not set)"}  # ${label}`)
    }
    return
  }
  if (!key || !isConfigKey(key)) throw new Error(`Unknown key. Available: ${Object.keys(CONFIG_KEYS).join(", ")}`)
  if (action === "get") return console.info(loadConfig()[key] ?? "")
  if (action === "set" || action === "unset") {
    const value = action === "set" ? rest.join(" ") : ""
    if (action === "set" && !value) throw new Error(`Usage: findplate config set ${key} <value>`)
    setConfig(key, value)
    return p.log.success(`${key} ${action === "set" ? "saved" : "removed"} in ${configPath()}`)
  }
  throw new Error("Usage: findplate config [list|get|set|unset|path] [key] [value]")
}
