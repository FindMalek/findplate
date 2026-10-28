import { expect, test } from "bun:test"
import { createLogger, REDACTED, resolveRequestId, withRequestId } from "./index"

test("json lines carry the request id and never a secret", () => {
  const lines: string[] = []
  const log = createLogger({ level: "info", pretty: false, write: (line) => lines.push(line) })

  withRequestId("req-12345678", () =>
    log.info("signed in", { headers: { cookie: "session=abc", accept: "json" }, nested: { password: "hunter2" } }),
  )
  log.debug("below the level")

  expect(lines).toHaveLength(1)
  const entry = JSON.parse(lines[0]!)
  expect(entry).toMatchObject({
    level: "info",
    msg: "signed in",
    requestId: "req-12345678",
    headers: { cookie: REDACTED, accept: "json" },
    nested: { password: REDACTED },
  })
})

test("an inbound request id is kept only when it is plain", () => {
  expect(resolveRequestId("abc-12345678")).toBe("abc-12345678")
  expect(resolveRequestId("bad id\nwith newline")).not.toContain("\n")
})
