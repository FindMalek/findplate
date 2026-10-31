import { expect, test } from "bun:test"
import { createCache, createCacheFromStore, createMemoryStore, createUpstashClient, createUpstashStore } from "./index"

test("without upstash keys the cache lives in memory: ttl expires, wrap loads once", async () => {
  let clock = 0
  const cache = createCacheFromStore(createMemoryStore(() => clock))
  let loads = 0
  const load = async () => ({ n: ++loads })
  expect(await cache.wrap("k", load, { ttlMs: 1000 })).toEqual({ n: 1 })
  expect(await cache.wrap("k", load, { ttlMs: 1000 })).toEqual({ n: 1 })
  clock = 1000
  expect(await cache.get("k")).toBeUndefined()
  expect(await cache.wrap("k", load)).toEqual({ n: 2 })
  expect(createCache({})).toBeDefined()
})

test("invalidating a tag drops every value carrying it and nothing else", async () => {
  const cache = createCacheFromStore(createMemoryStore())
  await cache.set("a", 1, { tags: ["user:1"] })
  await cache.set("b", 2, { tags: ["user:1", "list"] })
  await cache.set("c", 3, { tags: ["user:2"] })
  await cache.invalidateTag("user:1")
  expect([await cache.get("a"), await cache.get("b"), await cache.get("c")]).toEqual([undefined, undefined, 3])
})

test("upstash store sends redis commands, and a failing upstash reads as a miss", async () => {
  const sent: unknown[][] = []
  const replies: unknown[][] = [[{ result: "OK" }, { result: 1 }], [{ result: ["cache:a"] }], [{ result: 2 }]]
  const ok = createUpstashClient({
    url: "https://redis.test",
    token: "t",
    fetch: (async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)))
      return Response.json(replies.shift() ?? [{ result: null }])
    }) as unknown as typeof fetch,
  })
  const cache = createCacheFromStore(createUpstashStore(ok))
  await cache.set("a", { x: 1 }, { ttlMs: 500, tags: ["t"] })
  await cache.invalidateTag("t")
  expect(sent).toEqual([
    [
      ["SET", "cache:a", '{"x":1}', "PX", 500],
      ["SADD", "cache:tag:t", "cache:a"],
    ],
    [["SMEMBERS", "cache:tag:t"]],
    [["DEL", "cache:tag:t", "cache:a"]],
  ])

  const down = createUpstashClient({
    url: "https://redis.test",
    token: "t",
    fetch: (async () => {
      throw new Error("offline")
    }) as unknown as typeof fetch,
  })
  const original = console.error
  console.error = () => {}
  try {
    expect(await createCacheFromStore(createUpstashStore(down)).wrap("a", async () => "fresh")).toBe("fresh")
  } finally {
    console.error = original
  }
})
