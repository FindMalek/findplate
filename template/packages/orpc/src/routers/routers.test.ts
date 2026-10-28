import { afterAll, beforeAll, expect, test } from "bun:test"
import { createTestApp, type TestApp } from "../testing"

let app: TestApp
beforeAll(async () => {
  app = await createTestApp()
})
afterAll(() => app.close())

test("public status needs no session and reports a live database", async () => {
  expect(await app.anonymous.public.status()).toMatchObject({ api: "ok", database: "ok", env: "test" })
})

test("signed-in procedures answer 401 without a session and 403 without the csrf header", async () => {
  await expect(app.anonymous.me.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  const { headers } = await app.signUp("csrf@acme.test")
  headers.delete("x-csrf-token")
  await expect(app.clientFor(headers).me.get()).rejects.toMatchObject({ code: "FORBIDDEN" })
})

test("me returns the signed-in user and update renames them", async () => {
  const { client } = await app.signUp("ada@acme.test")
  expect(await client.me.get()).toMatchObject({ email: "ada@acme.test", role: "user" })
  await client.me.update({ name: "Ada L" })
  expect((await client.me.get()).name).toBe("Ada L")
})

test("notes: create, list, pin, delete", async () => {
  const { client } = await app.signUp("notes@acme.test")
  const note = await client.notes.create({ title: "first" })
  await client.notes.create({ title: "second" })

  await client.notes.update({ id: note.id, pinned: true })
  const listed = await client.notes.list()
  expect(listed.map((n) => n.title)).toEqual(["first", "second"])
  expect(await client.notes.stats()).toEqual({ total: 2, pinned: 1 })

  await client.notes.remove({ id: note.id })
  expect((await client.notes.list()).map((n) => n.title)).toEqual(["second"])
})

test("pinning a note keeps its body", async () => {
  const { client } = await app.signUp("pin@acme.test")
  const note = await client.notes.create({ title: "keep", body: "the body" })
  expect(await client.notes.update({ id: note.id, pinned: true })).toMatchObject({ body: "the body", pinned: true })
})

test("notes belong to their owner", async () => {
  const owner = await app.signUp("owner@acme.test")
  const other = await app.signUp("other@acme.test")
  const note = await owner.client.notes.create({ title: "private" })

  expect(await other.client.notes.list()).toEqual([])
  await expect(other.client.notes.update({ id: note.id, title: "mine now" })).rejects.toMatchObject({
    code: "NOT_FOUND",
  })
  await other.client.notes.remove({ id: note.id })
  expect(await owner.client.notes.list()).toHaveLength(1)
})

test("admin.users is for admins only", async () => {
  const member = await app.signUp("member@acme.test")
  const boss = await app.signUp("boss@acme.test", { role: "admin" })

  await expect(member.client.admin.users()).rejects.toMatchObject({ code: "FORBIDDEN" })
  const { total, users } = await boss.client.admin.users()
  expect(users.map((u) => u.email)).toContain("boss@acme.test")
  expect(total).toBeGreaterThanOrEqual(2)
})
