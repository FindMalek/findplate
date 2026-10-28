import { type Db, featureFlag } from "@acme/db"
import { eq } from "drizzle-orm"
import {
  FLAG_NAMES,
  FLAGS,
  type FlagName,
  type FlagSource,
  isFlagName,
  parseOverride,
  type Rollout,
  resolveFlag,
} from "./index"

export interface FlagState {
  name: FlagName
  description: string
  default: boolean
  source: FlagSource
  /** What the database says, null when it has no row. */
  stored: Rollout | null
  /** Set by `FLAGS_OVERRIDE`, which wins over the database and can't be edited here. */
  envRule: Rollout | null
  /** The answer for the caller. */
  enabled: boolean
}

export interface Flags {
  /** Every flag for one user (or anonymous). */
  all(userId?: string): Promise<Record<FlagName, boolean>>
  isOn(name: FlagName, userId?: string): Promise<boolean>
  list(userId?: string): Promise<FlagState[]>
  set(name: FlagName, rollout: Rollout): Promise<void>
  reset(name: FlagName): Promise<void>
}

const CACHE_MS = 5_000

export function createFlags(options: { db: Db; override?: string; now?: () => Date }): Flags {
  const { db, now = () => new Date() } = options
  const env = parseOverride(options.override)
  let cache: { at: number; rules: Partial<Record<FlagName, Rollout>> } | null = null

  async function stored() {
    if (cache && now().getTime() - cache.at < CACHE_MS) return cache.rules
    const rules: Partial<Record<FlagName, Rollout>> = {}
    try {
      for (const row of await db.select().from(featureFlag)) if (isFlagName(row.name)) rules[row.name] = row.rollout
    } catch (error) {
      console.error("[flags] could not read overrides, keeping the last ones", error)
      return cache?.rules ?? rules
    }
    cache = { at: now().getTime(), rules }
    return rules
  }

  const evaluate = async (name: FlagName, userId?: string) => resolveFlag(name, { env, db: await stored() }, userId)

  return {
    async all(userId) {
      const rules = { env, db: await stored() }
      return Object.fromEntries(FLAG_NAMES.map((name) => [name, resolveFlag(name, rules, userId).enabled])) as Record<
        FlagName,
        boolean
      >
    },
    async isOn(name, userId) {
      return (await evaluate(name, userId)).enabled
    },
    async list(userId) {
      const rules = await stored()
      return FLAG_NAMES.map((name) => {
        const result = resolveFlag(name, { env, db: rules }, userId)
        return {
          name,
          description: FLAGS[name].description,
          default: FLAGS[name].default,
          source: result.source,
          stored: rules[name] ?? null,
          envRule: env[name] ?? null,
          enabled: result.enabled,
        }
      })
    },
    async set(name, rollout) {
      await db
        .insert(featureFlag)
        .values({ name, rollout })
        .onConflictDoUpdate({ target: featureFlag.name, set: { rollout, updatedAt: now() } })
      cache = null
    },
    async reset(name) {
      await db.delete(featureFlag).where(eq(featureFlag.name, name))
      cache = null
    },
  }
}
