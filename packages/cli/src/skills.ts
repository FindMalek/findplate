import type { Manifest, SkillPack } from "./manifest"
import { run } from "./run"

export const SKILLS_PACKAGE = "skills@1.7.4"

/** Agents whose skills dir the skills cli fills. Zed, oh-my-pi and codex read the shared .agents/skills it always writes. */
const AGENTS = ["claude-code", "cursor", "opencode"]

/** The always-on packs plus the ones owned by the enabled modules. */
export function skillPacks(manifest: Manifest, modules: Iterable<string>): SkillPack[] {
  const enabled = new Set(modules)
  const owned = Object.entries(manifest.modules)
    .filter(([id]) => enabled.has(id))
    .flatMap(([, spec]) => spec.skills ?? [])
  return [...manifest.skills, ...owned]
}

export function skillsAddArgs(pack: SkillPack): string[] {
  return ["--yes", SKILLS_PACKAGE, "add", pack.source, "-s", ...pack.skills, "-a", ...AGENTS, "-y", "--copy"]
}

export type SkillsResult = { ok: true; installed: number } | { ok: false; reason: string }

/** Installs every pack. A pack that fails (offline, repo moved) is reported, the rest still go in. */
export async function installSkills(dir: string, packs: SkillPack[]): Promise<SkillsResult> {
  const failed: string[] = []
  for (const pack of packs) {
    try {
      await run("npx", skillsAddArgs(pack), dir)
    } catch (error) {
      const last =
        error instanceof Error
          ? error.message
              .split("\n")
              .filter((line) => line.trim())
              .at(-1)
          : undefined
      failed.push(last ? `${pack.source} (${last.trim()})` : pack.source)
    }
  }
  return failed.length
    ? { ok: false, reason: `could not install from ${failed.join(", ")}` }
    : { ok: true, installed: packs.length }
}
