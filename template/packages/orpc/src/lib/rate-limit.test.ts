import { expect, test } from "bun:test"
import { createMemoryLimiter, createUpstashLimiter, enforceRateLimit } from "./rate-limit"

const rule = { limit: 2, windowMs: 1000 }

test("memory limiter blocks over the limit and frees up as the window slides", async () => {
  let clock = 0
  const limiter = createMemoryLimiter(() => clock)
  expect((await limiter.hit("a", rule)).ok).toBe(true)
  clock = 400
  expect((await limiter.hit("a", rule)).remaining).toBe(0)
  const blocked = await limiter.hit("a", rule)
  expect(blocked).toEqual({ ok: false, remaining: 0, retryAfterMs: 600 })
  expect((await limiter.hit("b", rule)).ok).toBe(true)
  clock = 1001
  expect((await limiter.hit("a", rule)).ok).toBe(true)
})

test("enforceRateLimit counts per route and caller, and answers 429", async () => {
  const rateLimiter = createMemoryLimiter(() => 0)
  const caller = (ip: string) => ({
    rateLimiter,
    headers: new Headers({ "x-forwarded-for": `${ip}, 10.0.0.1` }),
    session: null,
  })
  await enforceRateLimit(caller("1.1.1.1"), "waitlist.join", rule)
  await enforceRateLimit(caller("1.1.1.1"), "waitlist.join", rule)
  await expect(enforceRateLimit(caller("1.1.1.1"), "waitlist.join", rule)).rejects.toMatchObject({
    code: "TOO_MANY_REQUESTS",
  })
  await enforceRateLimit(caller("2.2.2.2"), "waitlist.join", rule)
  await enforceRateLimit(caller("1.1.1.1"), "public.status", rule)

  const ssr = { rateLimiter, headers: new Headers(), session: null }
  for (let call = 0; call < 5; call++) await enforceRateLimit(ssr, "public.repo", rule)
})

test("upstash limiter reads the counter and fails open when the call breaks", async () => {
  const reply = (count: number) =>
    (async () => Response.json([{ result: count }, { result: 1 }, { result: 800 }])) as unknown as typeof fetch
  const config = { url: "https://redis.test", token: "t" }
  expect(await createUpstashLimiter({ ...config, fetch: reply(3) }).hit("a", rule)).toEqual({
    ok: false,
    remaining: 0,
    retryAfterMs: 800,
  })
  const broken = (async () => {
    throw new Error("down")
  }) as unknown as typeof fetch
  const silent = console.error
  console.error = () => {}
  expect((await createUpstashLimiter({ ...config, fetch: broken }).hit("a", rule)).ok).toBe(true)
  console.error = silent
})
