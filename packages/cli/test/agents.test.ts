import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { templateDir } from "../src/paths"

test("the template ships one ruler source targeting every supported agent", () => {
  const toml = readFileSync(join(templateDir(), ".ruler/ruler.toml"), "utf8")
  expect(toml).toContain('default_agents = ["claude", "cursor", "opencode", "zed", "pi"]')
  for (const server of ["context7", "shadcn", "vercel"]) expect(toml).toContain(`[mcp_servers.${server}]`)
  expect(readFileSync(join(templateDir(), ".ruler/AGENTS.md"), "utf8")).toContain("type(scope): subject")
})
