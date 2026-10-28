import { expect, test } from "bun:test"
import { bucket, parseOverride, resolveFlag } from "./index"

test("env beats the database beats the code default, and a partial rollout is stable per user", () => {
  expect(resolveFlag("betaBanner", {}).enabled).toBe(false)
  expect(resolveFlag("betaBanner", { db: { betaBanner: 100 } })).toMatchObject({ enabled: true, source: "db" })
  expect(resolveFlag("betaBanner", { db: { betaBanner: 100 }, env: { betaBanner: 0 } })).toMatchObject({
    enabled: false,
    source: "env",
  })

  const half = { db: { betaBanner: 50 } }
  expect(resolveFlag("betaBanner", half).enabled).toBe(false)
  const users = Array.from({ length: 200 }, (_, i) => `user-${i}`)
  const on = users.filter((id) => resolveFlag("betaBanner", half, id).enabled)
  expect(on.length).toBeGreaterThan(60)
  expect(on.length).toBeLessThan(140)
  expect(bucket("betaBanner", "user-1")).toBe(bucket("betaBanner", "user-1"))
})

test("FLAGS_OVERRIDE skips names and values it does not know", () => {
  expect(parseOverride("betaBanner=on, nope=true, betaBanner=250")).toEqual({ betaBanner: 100 })
  expect(parseOverride("betaBanner=25")).toEqual({ betaBanner: 25 })
})
