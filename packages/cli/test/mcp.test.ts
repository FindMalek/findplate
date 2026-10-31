import { expect, test } from "bun:test"
import { existsSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { handle, TOOLS } from "../src/commands/mcp"
import { planCreate } from "../src/commands/plan"

test("create plan resolves modules and lists files without writing", () => {
  const dir = join(mkdtempSync(join(tmpdir(), "fp-plan-")), "demo")
  const plan = planCreate({ dir, name: "demo", modules: "notification", json: true })
  expect(plan.modules).toContain("notification")
  expect(plan.added.length).toBeGreaterThan(0)
  expect(plan.files).toContain("package.json")
  expect(existsSync(dir)).toBe(false)
  expect(() => planCreate({ dir, name: "demo", modules: "nope", json: true })).toThrow("Unknown module")
})

test("mcp lists the tools and maps a call to cli arguments", async () => {
  const listed = (await handle({ jsonrpc: "2.0", id: 1, method: "tools/list" })) as {
    result: { tools: { name: string }[] }
  }
  expect(listed.result.tools.map((tool) => tool.name)).toEqual(TOOLS.map((tool) => tool.name))
  expect(listed.result.tools.map((tool) => tool.name)).toEqual(["create", "add", "remove", "update", "doctor"])

  let seen: string[] = []
  const called = (await handle(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "remove", arguments: { modules: ["ai"], dryRun: true } },
    },
    async (args) => {
      seen = args
      return { code: 3, stdout: "", stderr: "dirty" }
    },
  )) as { result: { isError: boolean; content: { text: string }[] } }
  expect(seen).toEqual(["remove", "ai", "--dry-run"])
  expect(called.result.isError).toBe(true)
  expect(called.result.content[0]?.text).toBe("dirty")
  expect(await handle({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeUndefined()
})
