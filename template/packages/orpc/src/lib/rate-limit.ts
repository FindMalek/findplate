import { ORPCError } from "@orpc/server"

export interface RateLimitRule {
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterMs: number
}

export interface RateLimiter {
  hit: (key: string, rule: RateLimitRule) => Promise<RateLimitResult>
}

/** Sensible defaults: every route is capped per caller, and the abusable ones get a tighter rule. */
export const RATE_LIMITS = {
  default: { limit: 120, windowMs: 60_000 },
  auth: { limit: 10, windowMs: 60_000 },
  waitlist: { limit: 5, windowMs: 10 * 60_000 },
} satisfies Record<string, RateLimitRule>

const MAX_KEYS = 10_000

/** Sliding window log kept in memory. Per process, so use the upstash backend when you run several api replicas. */
export function createMemoryLimiter(now: () => number = Date.now): RateLimiter {
  const store = new Map<string, { hits: number[]; windowMs: number }>()

  function sweep(at: number) {
    for (const [key, entry] of store) {
      if ((entry.hits.at(-1) ?? 0) <= at - entry.windowMs) store.delete(key)
    }
  }

  return {
    async hit(key, { limit, windowMs }) {
      const at = now()
      if (store.size > MAX_KEYS) sweep(at)
      const hits = (store.get(key)?.hits ?? []).filter((time) => time > at - windowMs)
      if (hits.length >= limit) {
        store.set(key, { hits, windowMs })
        return { ok: false, remaining: 0, retryAfterMs: (hits[0] ?? at) + windowMs - at }
      }
      hits.push(at)
      store.set(key, { hits, windowMs })
      return { ok: true, remaining: limit - hits.length, retryAfterMs: 0 }
    },
  }
}

/** Fixed window counter on Upstash Redis (REST). Shared between replicas; fails open when Upstash is unreachable. */
export function createUpstashLimiter(config: { url: string; token: string; fetch?: typeof fetch }): RateLimiter {
  const doFetch = config.fetch ?? fetch
  return {
    async hit(key, { limit, windowMs }) {
      try {
        const response = await doFetch(`${config.url}/pipeline`, {
          method: "POST",
          headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
          body: JSON.stringify([
            ["INCR", `rl:${key}`],
            ["PEXPIRE", `rl:${key}`, windowMs, "NX"],
            ["PTTL", `rl:${key}`],
          ]),
        })
        const [count, , ttl] = (await response.json()) as { result: number }[]
        if (!count || !ttl) throw new Error(`unexpected reply (${response.status})`)
        const used = count.result
        return used > limit
          ? { ok: false, remaining: 0, retryAfterMs: Math.max(ttl.result, 0) }
          : { ok: true, remaining: limit - used, retryAfterMs: 0 }
      } catch (error) {
        console.error("[rate-limit] upstash failed, letting the request through", error)
        return { ok: true, remaining: limit, retryAfterMs: 0 }
      }
    },
  }
}

export function createRateLimiter(config: { upstashUrl?: string; upstashToken?: string }): RateLimiter {
  return config.upstashUrl && config.upstashToken
    ? createUpstashLimiter({ url: config.upstashUrl, token: config.upstashToken })
    : createMemoryLimiter()
}

/** First hop of `x-forwarded-for`. Only trust it behind a proxy that sets it (Dokploy, Vercel, Cloudflare do). */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown"
}

/** Counts a call per route and caller (user id when signed in, ip otherwise). Throws 429 when over the rule. */
export async function enforceRateLimit(
  caller: { rateLimiter: RateLimiter; headers: Headers; session: { user: { id: string } } | null },
  route: string,
  rule: RateLimitRule,
): Promise<void> {
  const who = caller.session?.user.id ?? clientIp(caller.headers)
  const result = await caller.rateLimiter.hit(`${route}:${who}`, rule)
  if (!result.ok) {
    const seconds = Math.ceil(result.retryAfterMs / 1000)
    throw new ORPCError("TOO_MANY_REQUESTS", {
      message: `Too many requests. Try again in ${seconds}s.`,
      data: { retryAfterMs: result.retryAfterMs },
    })
  }
}
