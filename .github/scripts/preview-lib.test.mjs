import { expect, test } from "bun:test"
import { dockerPort, parseStatePayload, prAppName, previewHost, renderComment, tail, toStatus } from "./preview-lib.mjs"

test("pr names and domains", () => {
  expect(prAppName(12, "web")).toBe("pr-12-web")
  expect(previewHost(12, "api", ".preview.acme.dev")).toBe("pr-12-api.preview.acme.dev")
  expect(dockerPort("ENV NODE_ENV=production PORT=3001")).toBe(3001)
})

test("comment renders table, failure excerpt and round-trips state", () => {
  const body = renderComment({
    pr: 3,
    sha: "abcdef1234",
    state: { web: "id1" },
    rows: [
      {
        app: "web",
        status: "ready",
        url: "https://pr-3-web.p.dev",
        inspectUrl: "https://d/x",
        updatedAt: "2026-01-02T03:04:05Z",
      },
      { app: "api", status: "failed", error: "l1\nboom", updatedAt: "2026-01-02T03:04:05Z" },
    ],
  })
  expect(body).toContain(
    "| **web** | ✅ Ready | [Visit preview](https://pr-3-web.p.dev) | [Inspect](https://d/x) | 2026-01-02 03:04 UTC |",
  )
  expect(body).toContain("❌ Failed")
  expect(body).toContain("boom")
  expect(body).toContain("`abcdef1`")
  expect(parseStatePayload(body)).toEqual({ web: "id1" })
})

test("tail and status mapping", () => {
  expect(tail("a\nb\nc", 2)).toBe("b\nc")
  expect(toStatus({ status: "done" })).toBe("ready")
  expect(toStatus({ status: "error" })).toBe("failed")
  expect(toStatus({ status: "running" })).toBe("building")
})
