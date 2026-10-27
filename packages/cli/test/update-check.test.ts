import { expect, test } from "bun:test"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { checkForUpdate, isExpired, isNewer, shouldSkip } from "../src/update-check"

test("the registry is asked once a day and the cache answers in between", async () => {
  const file = join(mkdtempSync(join(tmpdir(), "fp-update-")), "update-check.json")
  let calls = 0
  const fetchLatest = async () => {
    calls++
    return "0.2.0"
  }
  const hour = 60 * 60 * 1000
  expect(await checkForUpdate({ current: "0.1.0", now: 1000, file, fetchLatest })).toBe("0.2.0")
  expect(await checkForUpdate({ current: "0.1.0", now: 1000 + hour, file, fetchLatest })).toBe("0.2.0")
  expect(calls).toBe(1)
  expect(isExpired(1000, 1000 + 25 * hour)).toBe(true)
  expect(await checkForUpdate({ current: "0.2.0", now: 1000 + 25 * hour, file, fetchLatest })).toBeUndefined()
  expect(calls).toBe(2)
})

test("an unreachable registry never throws", async () => {
  const file = join(mkdtempSync(join(tmpdir(), "fp-update-")), "update-check.json")
  const fetchLatest = async () => {
    throw new Error("offline")
  }
  expect(await checkForUpdate({ current: "0.1.0", file, fetchLatest })).toBeUndefined()
})

test("versions compare numerically and ci, non-tty and opt-outs skip the check", () => {
  expect(isNewer("0.10.0", "0.9.5")).toBe(true)
  expect(isNewer("0.1.0", "0.1.0")).toBe(false)
  const base = { flag: false, env: {}, isTTY: true }
  expect(shouldSkip(base)).toBe(false)
  expect(shouldSkip({ ...base, isTTY: false })).toBe(true)
  expect(shouldSkip({ ...base, flag: true })).toBe(true)
  expect(shouldSkip({ ...base, env: { CI: "true" } })).toBe(true)
  expect(shouldSkip({ ...base, env: { FINDPLATE_NO_UPDATE_CHECK: "1" } })).toBe(true)
})
