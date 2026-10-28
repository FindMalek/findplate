import { readFileSync } from "node:fs"
import { join } from "node:path"
import { templateDir } from "./paths"

export const PROFILE_IDS = ["minimal", "standard", "everything"] as const
export type ProfileId = (typeof PROFILE_IDS)[number]

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
  /** Key of `Manifest.groups`; the picker and the docs list modules by it. */
  group: string
  /** Profiles that switch this module on. Left out of all of them, it is custom only. */
  profiles: ProfileId[]
  /** A server the user has to run themselves before the module does anything. */
  server?: { label: string; url: string }
  /** Paths (relative to the template root) that only exist for this module. */
  paths: string[]
  /** Dependencies to drop from every package.json and the pnpm catalog when the module is off. */
  packages: string[]
  keys?: ModuleKey[]
  /** Modules this one needs; the cli switches them on too. */
  requires?: string[]
  /** Root package.json scripts added when the module is on. */
  scripts?: Record<string, string>
  skills?: SkillPack[]
}

export interface Manifest {
  name: string
  scope: string
  skills: SkillPack[]
  /** Group id to label, in the order the picker shows them. */
  groups: Record<string, string>
  modules: Record<string, ModuleSpec>
}

/** Throws a readable error when a module lacks metadata or points at something that doesn't exist. */
export function validateManifest(manifest: Manifest): Manifest {
  const problems: string[] = []
  for (const [id, spec] of Object.entries(manifest.modules)) {
    if (!spec.label) problems.push(`${id}: label is missing`)
    if (!spec.hint) problems.push(`${id}: hint is missing`)
    if (!manifest.groups?.[spec.group]) problems.push(`${id}: group "${spec.group}" is not in groups`)
    if (!Array.isArray(spec.profiles)) problems.push(`${id}: profiles must be a list`)
    for (const profile of spec.profiles ?? [])
      if (!PROFILE_IDS.includes(profile)) problems.push(`${id}: unknown profile "${profile}"`)
    for (const required of spec.requires ?? [])
      if (!manifest.modules[required]) problems.push(`${id}: requires unknown module "${required}"`)
  }
  if (problems.length) throw new Error(`Invalid findplate.json:\n${problems.join("\n")}`)
  return manifest
}

export function loadManifest(dir = templateDir()): Manifest {
  return validateManifest(JSON.parse(readFileSync(join(dir, "findplate.json"), "utf8")) as Manifest)
}
