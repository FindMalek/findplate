import { afterAll, beforeAll, expect, test } from "bun:test"
import { createTestApp, type TestApp } from "@acme/orpc/testing"
import { createServer } from "./server"

const ORIGIN = "http://localhost:3002"
const PASSWORD = "correct horse battery"

let app: TestApp
let handle: (request: Request) => Promise<Response>
beforeAll(async () => {
  app = await createTestApp()
  handle = createServer(app.services, { publicUrl: "http://localhost:3001" })
})
afterAll(() => app.close())

const call = (path: string, init: RequestInit = {}) => handle(new Request(`http://localhost:3001${path}`, init))

test("/health reports the database", async () => {
  const response = await call("/health")
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ ok: true, db: true, env: "test" })
})

test("sign up over http, then use the session cookie on the REST api", async () => {
  const signUp = await call("/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify({ email: "web@acme.test", password: PASSWORD, name: "Web" }),
  })
  expect(signUp.status).toBe(200)
  const cookie = signUp.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ")

  const me = await call("/v1/me", { headers: { cookie, "x-csrf-token": "orpc" } })
  expect(me.status).toBe(200)
  expect(await me.json()).toMatchObject({ email: "web@acme.test" })

  expect((await call("/v1/me", { headers: { "x-csrf-token": "orpc" } })).status).toBe(401)
})

test("unknown paths are a 404", async () => {
  expect((await call("/nope")).status).toBe(404)
})

// @findplate:api-keys
test("a bearer key works without a cookie, a read key cannot write, a revoked key stops", async () => {
  const owner = await app.signUp("keys@acme.test")
  const read = await owner.client.apiKeys.create({ name: "ci", scope: "read" })
  const bearer = { authorization: `Bearer ${read.key}` }

  expect((await call("/v1/me", { headers: bearer })).status).toBe(200)
  const write = await call("/v1/notes", {
    method: "POST",
    headers: { ...bearer, "content-type": "application/json" },
    body: JSON.stringify({ title: "x" }),
  })
  expect(write.status).toBe(403)

  await owner.client.apiKeys.revoke({ id: read.id })
  expect((await call("/v1/me", { headers: bearer })).status).toBe(401)
})
// @end
