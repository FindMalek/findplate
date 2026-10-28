import { expect, test } from "bun:test"
import { buildEnv } from "../src/generate/env"
import { stripModules } from "../src/generate/strip"
import { spawnPlan, toPosix } from "../src/platform"

test("spawnPlan sends pnpm through a shell on windows only, with quoted args", () => {
  expect(spawnPlan("pnpm", ["add", "a b"], "win32")).toEqual({ cmd: "pnpm", args: ["add", '"a b"'], shell: true })
  expect(spawnPlan("git", ["status"], "win32").shell).toBe(false)
  expect(spawnPlan("pnpm", ["install"], "linux")).toEqual({ cmd: "pnpm", args: ["install"], shell: false })
})

test("toPosix turns windows separators into slashes", () => {
  expect(toPosix("apps\\web\\app.ts")).toBe("apps/web/app.ts")
})

test("stripModules keeps CRLF files CRLF and still strips markers", () => {
  const source = ["a", "// @findplate:ai", "b", "// @end", "c", ""].join("\r\n")
  expect(stripModules(source, new Set())).toBe("a\r\nc\r\n")
  expect(stripModules(source, new Set(["ai"]))).toBe("a\r\nb\r\nc\r\n")
})

test("buildEnv fills keys in a CRLF .env.example", () => {
  expect(buildEnv("A=1\r\nB=2\r\n", { A: "x" })).toBe("A=x\r\nB=2\r\n")
})
