import { afterAll, beforeAll, expect, test } from "bun:test"
import { type Auth, createAuth } from "@acme/auth"
import { user } from "@acme/db"
import { createTestDb, type TestDb } from "@acme/db/testing"
import { eq } from "drizzle-orm"
import { ensureAdmin } from "./admin"

let testDb: TestDb
let auth: Auth
beforeAll(async () => {
  testDb = await createTestDb()
  auth = createAuth({
    db: testDb.db,
    secret: "test-secret-test-secret-test-secret!",
    dashboardUrl: "http://localhost:3002",
    trustedOrigins: ["http://localhost:3002"],
    secureCookies: false,
  })
})
afterAll(() => testDb.close())

const canSignIn = (email: string, password: string) =>
  auth.api.signInEmail({ body: { email, password } }).then(
    () => true,
    () => false,
  )

test("ensureAdmin does nothing without credentials", async () => {
  expect(await ensureAdmin(testDb.db, auth)).toBeUndefined()
})

test("ensureAdmin creates the admin, then resets its password and role on the next start", async () => {
  const email = "Root@acme.test"
  const id = await ensureAdmin(testDb.db, auth, email, "first password 1")
  expect(id).toBeString()
  expect(await canSignIn(email, "first password 1")).toBe(true)

  await testDb.db.update(user).set({ role: "user" }).where(eq(user.id, id!))
  expect(await ensureAdmin(testDb.db, auth, email, "second password 2")).toBe(id)

  expect(await canSignIn(email, "first password 1")).toBe(false)
  expect(await canSignIn(email, "second password 2")).toBe(true)
  const row = await testDb.db.query.user.findFirst({ where: eq(user.id, id!) })
  expect(row).toMatchObject({ role: "admin", emailVerified: true })
})
