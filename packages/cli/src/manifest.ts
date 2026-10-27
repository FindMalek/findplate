import { readFileSync } from "node:fs"
import { join } from "node:path"
import { templateDir } from "./paths"

export interface ModuleKey {
  env: string
  label: string
  url: string
}

/** Public skills from one repo, installed with the skills cli. */
export interface SkillPack {
  source: string
  skills: string[]
}

export interface ModuleSpec {
  label: string
  hint: string
  default: boolean
  /** Paths (relative to the template root) that only exist for this module. */
  paths: string[]
  /** Dependencies to drop from every package.json and the pnpm catalog when the module is off. */
  packages: string[]
  keys?: ModuleKey[]
  skills?: SkillPack[]
}

export interface Manifest {
  name: string
  scope: string
  skills: SkillPack[]
  modules: Record<string, ModuleSpec>
}

export function loadManifest(dir = templateDir()): Manifest {
  return JSON.parse(readFileSync(join(dir, "findplate.json"), "utf8")) as Manifest
}
