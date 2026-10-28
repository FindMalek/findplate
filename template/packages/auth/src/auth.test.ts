import { afterAll, beforeAll, expect, test } from "bun:test"
import { createTestDb, type TestDb } from "@acme/db/testing"
import { type Auth, createAuth } from "./index"

const ORIGIN = "http://localhost:3002"
const PASSWORD = "correct horse battery"

let testDb: TestDb
let auth: Auth
beforeAll(async () => {
  testDb = await createTestDb()
  auth = createAuth({
    db: testDb.db,
    secret: "test-secret-test-secret-test-secret!",
    dashboardUrl: ORIGIN,
    trustedOrigins: [ORIGIN],
    secureCookies: false,
  })
})
afterAll(() => testDb.close())

const post = (path: string, body: object) =>
  auth.handler(
    new Request(`${ORIGIN}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify(body),
    }),
  )

test("sign up, sign in and read the session through the real handlers", async () => {
  const email = "ada@acme.test"
  expect((await post("/sign-up/email", { email, password: PASSWORD, name: "Ada" })).status).toBe(200)

  const signIn = await post("/sign-in/email", { email, password: PASSWORD })
  expect(signIn.status).toBe(200)
  const cookie = signIn.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ")

  const session = await auth.api.getSession({ headers: new Headers({ cookie }) })
  expect(session?.user).toMatchObject({ email, name: "Ada" })
})

test("a wrong password or a short one is refused", async () => {
  await post("/sign-up/email", { email: "grace@acme.test", password: PASSWORD, name: "Grace" })
  expect((await post("/sign-in/email", { email: "grace@acme.test", password: "not the password" })).status).toBe(401)
  expect((await post("/sign-up/email", { email: "short@acme.test", password: "short", name: "S" })).status).toBe(400)
})

test("an email can only sign up once", async () => {
  const body = { email: "once@acme.test", password: PASSWORD, name: "Once" }
  expect((await post("/sign-up/email", body)).status).toBe(200)
  expect((await post("/sign-up/email", body)).status).toBeGreaterThanOrEqual(400)
})
