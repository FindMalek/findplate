import { has, run } from "./run"

export const RULER_PACKAGE = "@intellectronica/ruler@0.3.46"

export type AgentsResult = { ok: true } | { ok: false; reason: string }

/** Generates every agent's rules, MCP config and skills from `.ruler/`. Never throws: offline or missing ruler is a note. */
export async function applyAgents(dir: string): Promise<AgentsResult> {
  try {
    if (await has("ruler")) await run("ruler", ["apply"], dir)
    else await run("npx", ["--yes", RULER_PACKAGE, "apply"], dir)
    return { ok: true }
  } catch (error) {
    const reason = error instanceof Error ? (error.message.split("\n")[0] ?? "unknown error") : "unknown error"
    return { ok: false, reason }
  }
}
