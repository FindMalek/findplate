import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))

/** Published package: template/ and presets/ sit next to dist/. In this repo: at the root. */
function find(name: string): string {
  for (const candidate of [join(here, "..", name), join(here, "..", "..", "..", name)]) {
    if (existsSync(candidate)) return resolve(candidate)
  }
  throw new Error(`findplate: can't find its ${name}/ folder next to ${here}`)
}

export const templateDir = () => find("template")
export const presetsDir = () => find("presets")
