export interface CacheStore {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string, ttlMs: number | undefined, tags: string[]) => Promise<void>
  delete: (key: string) => Promise<void>
  invalidateTag: (tag: string) => Promise<void>
}

export interface CacheOptions {
  /** How long the value lives. Without it the value stays until it is deleted or its tag is invalidated. */
  ttlMs?: number
  /** Names to invalidate this value by, e.g. `user:42`. */
  tags?: string[]
}

export interface Cache {
  get: <T>(key: string) => Promise<T | undefined>
  set: <T>(key: string, value: T, options?: CacheOptions) => Promise<void>
  delete: (key: string) => Promise<void>
  invalidateTag: (tag: string) => Promise<void>
  /** The cached value, or `load()` stored and returned. `undefined` results are not stored. */
  wrap: <T>(key: string, load: () => Promise<T>, options?: CacheOptions) => Promise<T>
}

/** Values live in this process. Fine for dev and a single api replica; use Upstash when you run several. */
export function createMemoryStore(now: () => number = Date.now): CacheStore {
  const entries = new Map<string, { value: string; expiresAt: number | null }>()
  const tagged = new Map<string, Set<string>>()
  return {
    async get(key) {
      const entry = entries.get(key)
      if (!entry) return null
      if (entry.expiresAt !== null && entry.expiresAt <= now()) {
        entries.delete(key)
        return null
      }
      return entry.value
    },
    async set(key, value, ttlMs, tags) {
      entries.set(key, { value, expiresAt: ttlMs === undefined ? null : now() + ttlMs })
      for (const tag of tags) tagged.set(tag, (tagged.get(tag) ?? new Set()).add(key))
    },
    async delete(key) {
      entries.delete(key)
    },
    async invalidateTag(tag) {
      for (const key of tagged.get(tag) ?? []) entries.delete(key)
      tagged.delete(tag)
    },
  }
}

type Command = (string | number)[]

/** Upstash Redis over REST: a pipeline of commands in one request, no socket to keep open. */
export function createUpstashClient(config: { url: string; token: string; fetch?: typeof fetch }) {
  const doFetch = config.fetch ?? fetch
  return {
    async pipeline(commands: Command[]): Promise<unknown[]> {
      const response = await doFetch(`${config.url}/pipeline`, {
        method: "POST",
        headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
        body: JSON.stringify(commands),
      })
      const replies = (await response.json()) as { result?: unknown; error?: string }[]
      const failed = Array.isArray(replies) ? replies.find((reply) => reply.error) : null
      if (!Array.isArray(replies) || failed) throw new Error(failed?.error ?? `unexpected reply (${response.status})`)
      return replies.map((reply) => reply.result)
    },
  }
}

export type UpstashClient = ReturnType<typeof createUpstashClient>

export function createUpstashStore(client: UpstashClient): CacheStore {
  const tagKey = (tag: string) => `cache:tag:${tag}`
  return {
    async get(key) {
      const [value] = await client.pipeline([["GET", `cache:${key}`]])
      return typeof value === "string" ? value : null
    },
    async set(key, value, ttlMs, tags) {
      const stored: Command = ["SET", `cache:${key}`, value]
      if (ttlMs !== undefined) stored.push("PX", Math.max(1, Math.round(ttlMs)))
      await client.pipeline([stored, ...tags.map((tag): Command => ["SADD", tagKey(tag), `cache:${key}`])])
    },
    async delete(key) {
      await client.pipeline([["DEL", `cache:${key}`]])
    },
    async invalidateTag(tag) {
      const [members] = await client.pipeline([["SMEMBERS", tagKey(tag)]])
      const keys = Array.isArray(members)
        ? members.filter((member): member is string => typeof member === "string")
        : []
      await client.pipeline([["DEL", tagKey(tag), ...keys]])
    },
  }
}

/** Typed JSON cache over a store. A store that throws (Upstash down) acts as a miss, so a broken cache never breaks a request. */
export function createCacheFromStore(store: CacheStore): Cache {
  const guard = async <T>(action: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await action()
    } catch (error) {
      console.error("[cache] store failed, skipping the cache", error)
      return fallback
    }
  }
  const cache: Cache = {
    async get<T>(key: string) {
      const raw = await guard(() => store.get(key), null)
      return raw === null ? undefined : (JSON.parse(raw) as T)
    },
    async set(key, value, options = {}) {
      if (value === undefined) return
      await guard(() => store.set(key, JSON.stringify(value), options.ttlMs, options.tags ?? []), undefined)
    },
    delete: (key) => guard(() => store.delete(key), undefined),
    invalidateTag: (tag) => guard(() => store.invalidateTag(tag), undefined),
    async wrap<T>(key: string, load: () => Promise<T>, options?: CacheOptions) {
      const hit = await cache.get<T>(key)
      if (hit !== undefined) return hit
      const value = await load()
      await cache.set(key, value, options)
      return value
    },
  }
  return cache
}

/** Upstash when both keys are set (the same two keys `rate-limit` uses), in memory otherwise. */
export function createCache(config: { upstashUrl?: string; upstashToken?: string }): Cache {
  return createCacheFromStore(
    config.upstashUrl && config.upstashToken
      ? createUpstashStore(createUpstashClient({ url: config.upstashUrl, token: config.upstashToken }))
      : createMemoryStore(),
  )
}
