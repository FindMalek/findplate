import { type Manifest, type ModuleKey, type ModuleSpec, PROFILE_IDS, type ProfileId } from "./manifest"

export const PROFILE_INFO: Record<ProfileId, { label: string; description: string }> = {
  minimal: { label: "Minimal", description: "just the core, add modules later with findplate add" },
  standard: { label: "Standard", description: "the usual starting set, nothing to host yourself" },
  everything: { label: "Everything", description: "every module that runs without a server of your own" },
}

export const isProfile = (value: string): value is ProfileId => (PROFILE_IDS as readonly string[]).includes(value)

/** Adds what the chosen modules require. `added` says which module pulled each one in. */
export function expandRequires(manifest: Manifest, ids: readonly string[]) {
  const modules = [...ids]
  const added: { id: string; by: string }[] = []
  for (let i = 0; i < modules.length; i++) {
    for (const required of manifest.modules[modules[i]!]?.requires ?? []) {
      if (modules.includes(required)) continue
      modules.push(required)
      added.push({ id: required, by: modules[i]! })
    }
  }
  return { modules, added }
}

export function profileModules(manifest: Manifest, profile: ProfileId): string[] {
  const ids = Object.entries(manifest.modules)
    .filter(([, spec]) => spec.profiles.includes(profile))
    .map(([id]) => id)
  return expandRequires(manifest, ids).modules
}

/** Modules to generate: `--modules` wins, then the profile, then `standard`. */
export function pickModules(manifest: Manifest, opts: { modules?: string; profile?: string }) {
  if (opts.modules !== undefined) {
    const ids = opts.modules
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean)
    const unknown = ids.filter((m) => !manifest.modules[m])
    if (unknown.length) throw new Error(`Unknown module(s): ${unknown.join(", ")}`)
    return { ...expandRequires(manifest, ids), profile: "custom" }
  }
  const profile = opts.profile ?? "standard"
  if (!isProfile(profile)) throw new Error(`Unknown profile "${profile}". Available: ${PROFILE_IDS.join(", ")}`)
  return { modules: profileModules(manifest, profile), added: [], profile }
}

/** Module ids per group, in the manifest's group order; empty groups are left out. */
export function groupModules(manifest: Manifest): { id: string; label: string; modules: string[] }[] {
  return Object.entries(manifest.groups)
    .map(([id, label]) => ({
      id,
      label,
      modules: Object.entries(manifest.modules)
        .filter(([, spec]) => spec.group === id)
        .map(([moduleId]) => moduleId),
    }))
    .filter((group) => group.modules.length)
}

export interface Need {
  module: string
  /** An env key to fill in, or a server to run when `server` is set. */
  key?: ModuleKey
  server?: { label: string; url: string }
}

export const needsOf = (id: string, spec: ModuleSpec): Need[] => [
  ...(spec.server ? [{ module: id, server: spec.server }] : []),
  ...(spec.keys ?? []).map((key) => ({ module: id, key })),
]

/** What the chosen modules need from the user: a server first, then keys. */
export function needsFor(manifest: Manifest, modules: readonly string[]): Need[] {
  return modules.flatMap((id) => (manifest.modules[id] ? needsOf(id, manifest.modules[id]) : []))
}

/** Keys of the chosen modules that have no value in `env`. */
export function pendingKeys(manifest: Manifest, modules: readonly string[], env: Record<string, string>): Need[] {
  return needsFor(manifest, modules).filter((need) => need.key && !env[need.key.env])
}

export function renderNeeds(needs: Need[]): string {
  return needs
    .map((need) =>
      need.key
        ? `${need.key.env}  ${need.key.label}  ${need.key.url}`
        : `${need.module}  needs ${need.server?.label}  ${need.server?.url}`,
    )
    .join("\n")
}
