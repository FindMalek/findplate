import { afterAll, beforeAll, expect, test } from "bun:test"
import { count } from "drizzle-orm"
import { notes, user } from "../schema"
import { createTestDb, type TestDb } from "../testing"
import { seedDemo } from "./index"

let testDb: TestDb
beforeAll(async () => {
  testDb = await createTestDb()
})
afterAll(() => testDb.close())

test("seeding twice leaves the first run's data alone", async () => {
  const { db } = testDb
  const totals = async () => ({
    users: (await db.select({ n: count() }).from(user))[0]?.n,
    notes: (await db.select({ n: count() }).from(notes))[0]?.n,
  })

  expect(await seedDemo(db)).toBe(true)
  const first = await totals()
  expect(first.users).toBeGreaterThan(0)
  expect(first.notes).toBeGreaterThan(0)

  expect(await seedDemo(db)).toBe(false)
  expect(await totals()).toEqual(first)
})
