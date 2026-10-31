import { expect, test } from "bun:test"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { demoFlags } from "../src/commands/demo"

test("demo generates a throwaway standard project without git, agents or prompts", () => {
  const flags = demoFlags()
  expect(flags.dir).toBe(join(tmpdir(), "findplate-demo"))
  expect(flags).toMatchObject({ yes: true, git: false, agents: false, skills: false, profile: "standard" })
  expect(demoFlags("/x/y").dir).toBe("/x/y")
})
