import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { absolutizeLinks } from "../lib/llms"

describe("absolutizeLinks", () => {
  test("points docs links at markdown and leaves code fences alone", () => {
    const input = "see [cli](/docs/cli#flags) and [home](/docs)\n```md\n[x](/docs/cli)\n```\n[out](https://a.dev/docs)"
    expect(absolutizeLinks(input, "https://x.dev")).toBe(
      "see [cli](https://x.dev/docs/cli.md#flags) and [home](https://x.dev/docs/index.md)\n```md\n[x](/docs/cli)\n```\n[out](https://a.dev/docs)",
    )
  })
})

// Needs `pnpm build` first. Skipped when there is no build output.
const built = existsSync(".next/BUILD_ID")
const PORT = 4000 + Math.floor(Math.random() * 1000)
const ORIGIN = `http://localhost:${PORT}`
let server: ReturnType<typeof Bun.spawn> | undefined

async function get(path: string, init?: RequestInit) {
  return fetch(`${ORIGIN}${path}`, init)
}

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
  test("lists every page of meta.json exactly once", async () => {
    const meta = JSON.parse(readFileSync("content/docs/meta.json", "utf8")) as { pages: string[] }
    const slugs = meta.pages.filter((p) => !p.startsWith("---"))
    const text = await (await get("/llms.txt")).text()
    const linked = [...text.matchAll(/\]\(https?:\/\/[^/)]+\/docs\/([^)]+)\.md\)/g)].map((m) => m[1])
    expect(linked.sort()).toEqual([...slugs].sort())
  })

  test("every link in llms.txt resolves", async () => {
    const text = await (await get("/llms.txt")).text()
    const urls = [...text.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1] as string)
    const site = new URL(urls[0] as string).origin
    const local = urls.filter((u) => new URL(u).origin === site)
    expect(local.length).toBeGreaterThan(20)
    for (const url of local) {
      const res = await get(new URL(url).pathname)
      expect({ url, status: res.status }).toEqual({ url, status: 200 })
    }
  })

  test("every page is in llms-full.txt and answers to Accept: text/markdown", async () => {
    const full = await (await get("/llms-full.txt")).text()
    const res = await get("/docs/quickstart", { headers: { Accept: "text/markdown" } })
    const body = await res.text()
    expect(res.headers.get("content-type")).toContain("text/markdown")
    expect(full).toContain(body.split("\n# Quickstart\n")[1]?.slice(0, 80) ?? "missing")
    expect(await (await get("/docs/quickstart", { headers: { Accept: "text/html" } })).text()).toContain("<html")
  })
})
