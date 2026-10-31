interface FlagDefinition {
  /** The value when nothing overrides it. */
  default: boolean
  description: string
}

/** Every flag the project has. Add yours here: the name is a typed key everywhere else. */
export const FLAGS = {
  betaBanner: { default: false, description: "Show the beta badge in the dashboard" },
} as const satisfies Record<string, FlagDefinition>

export type FlagName = keyof typeof FLAGS

export const FLAG_NAMES = Object.keys(FLAGS) as [FlagName, ...FlagName[]]

export const isFlagName = (value: string): value is FlagName => value in FLAGS

/** 0 is off, 100 is on for everyone, in between is that share of signed-in users. */
export type Rollout = number

const rolloutOf = (enabled: boolean): Rollout => (enabled ? 100 : 0)

/**
 * `FLAGS_OVERRIDE="betaBanner=true,otherFlag=25"`: `true`/`false`/`on`/`off` or a percentage. Unknown names and
 * values that are not understood are skipped.
 */
export function parseOverride(raw: string | undefined): Partial<Record<FlagName, Rollout>> {
  const rules: Partial<Record<FlagName, Rollout>> = {}
  for (const part of (raw ?? "").split(",")) {
    const [name = "", value = ""] = part.split("=").map((piece) => piece.trim())
    if (!isFlagName(name)) continue
    if (["true", "on"].includes(value)) rules[name] = 100
    else if (["false", "off"].includes(value)) rules[name] = 0
    else if (/^\d{1,3}$/.test(value) && Number(value) <= 100) rules[name] = Number(value)
  }
  return rules
}

/** A stable 0-99 per flag and user (FNV-1a), so a user keeps their answer while the rollout grows. */
export function bucket(name: string, userId: string): number {
  let hash = 2166136261
  for (const char of `${name}:${userId}`) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export type FlagSource = "env" | "db" | "default"

/** Env beats the database, which beats the default in code. A partial rollout needs a user: anonymous callers get off. */
export function resolveFlag(
  name: FlagName,
  rules: { env?: Partial<Record<FlagName, Rollout>>; db?: Partial<Record<FlagName, Rollout>> },
  userId?: string,
): { enabled: boolean; source: FlagSource; rollout: Rollout } {
  const fromEnv = rules.env?.[name]
  const fromDb = rules.db?.[name]
  const source: FlagSource = fromEnv !== undefined ? "env" : fromDb !== undefined ? "db" : "default"
  const rollout = fromEnv ?? fromDb ?? rolloutOf(FLAGS[name].default)
  const enabled = rollout >= 100 || (rollout > 0 && userId !== undefined && bucket(name, userId) < rollout)
  return { enabled, source, rollout }
}
