import { afterAll, beforeAll, expect, test } from "bun:test"
import { user } from "@acme/db"
import { createTestApp, type TestApp } from "@acme/orpc/testing"
import { eq } from "drizzle-orm"
import { ensureAdmin } from "./admin"

let app: TestApp
beforeAll(async () => {
  app = await createTestApp()
})
afterAll(() => app.close())

const canSignIn = (email: string, password: string) =>
  app.services.auth.api.signInEmail({ body: { email, password } }).then(
    () => true,
    () => false,
  )

test("ensureAdmin does nothing without credentials", async () => {
  const { db, auth } = app.services
  expect(await ensureAdmin(db, auth)).toBeUndefined()
})

test("ensureAdmin creates the admin, then resets its password and role on the next start", async () => {
  const { db, auth } = app.services
  const email = "Root@acme.test"
  const id = await ensureAdmin(db, auth, email, "first password 1")
  expect(id).toBeString()
  expect(await canSignIn(email, "first password 1")).toBe(true)

  await db.update(user).set({ role: "user" }).where(eq(user.id, id!))
  expect(await ensureAdmin(db, auth, email, "second password 2")).toBe(id)

  expect(await canSignIn(email, "first password 1")).toBe(false)
  expect(await canSignIn(email, "second password 2")).toBe(true)
  const row = await db.query.user.findFirst({ where: eq(user.id, id!) })
  expect(row).toMatchObject({ role: "admin", emailVerified: true })
})
