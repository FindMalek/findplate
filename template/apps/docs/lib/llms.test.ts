import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { existsSync, readdirSync } from "node:fs"

// Needs `pnpm build` first (CI runs it right after the build). Skipped without build output.
const built = existsSync(".next/BUILD_ID")
const PORT = 4000 + Math.floor(Math.random() * 1000)
const get = (path: string) => fetch(`http://localhost:${PORT}${path}`)
let server: ReturnType<typeof Bun.spawn> | undefined

beforeAll(async () => {
  if (!built) return
  server = Bun.spawn(["node_modules/.bin/next", "start", "-p", String(PORT)], { stdout: "ignore", stderr: "ignore" })
  for (let i = 0; i < 100; i++) {
    try {
      if ((await get("/llms.txt")).ok) return
    } catch {}
    await Bun.sleep(200)
  }
  throw new Error("next start did not come up")
})

afterAll(() => server?.kill())

describe.skipIf(!built)("llms.txt against the build", () => {
  test("llms.txt and llms-full.txt list every docs page", async () => {
    const slugs = readdirSync("content/docs")
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => file.replace(/\.mdx$/, ""))
    const index = await (await get("/llms.txt")).text()
    const full = await (await get("/llms-full.txt")).text()
    expect(slugs.length).toBeGreaterThan(0)
    for (const slug of slugs) {
      const path = slug === "index" ? "/docs/index.md" : `/docs/${slug}.md`
      expect(index).toContain(`${path})`)
      expect(full).toContain(path)
    }
  })
})
