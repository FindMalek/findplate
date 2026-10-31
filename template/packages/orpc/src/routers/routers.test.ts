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

// @findplate:audit-log
test("audit log: actions are recorded and only admins can read them", async () => {
  const { client } = await app.signUp("audited@acme.test")
  const admin = await app.signUp("audit-admin@acme.test", { role: "admin" })
  const note = await client.notes.create({ title: "temp" })
  await client.notes.remove({ id: note.id })

  await expect(client.admin.audit.list({})).rejects.toMatchObject({ code: "FORBIDDEN" })
  const entries = await admin.client.admin.audit.list({ action: "note." })
  expect(entries).toContainEqual(
    expect.objectContaining({ action: "note.delete", targetId: note.id, actorEmail: "audited@acme.test" }),
  )
})
// @end

// @findplate:orgs
test("orgs: notes follow the active organization and only members can switch to it", async () => {
  const ada = await app.signUp("ada-org@acme.test")
  const bob = await app.signUp("bob-org@acme.test")
  const created = await app.services.auth.api.createOrganization({
    body: { name: "Acme", slug: "acme" },
    headers: ada.headers,
    returnHeaders: true,
  })
  // The session is cookie cached: carry the cookies the call just set, as a browser would.
  const jar = new Map<string, string>()
  for (const line of [ada.headers.get("cookie") ?? "", ...created.headers.getSetCookie()]) {
    for (const part of line.split("; ")) jar.set(part.split("=")[0] ?? "", part.split(";")[0] ?? "")
  }
  const inOrg = app.clientFor(new Headers({ cookie: [...jar.values()].join("; "), "x-csrf-token": "orpc" }))

  await inOrg.notes.create({ title: "team plan" })
  expect((await inOrg.notes.list()).map((n) => n.title)).toEqual(["team plan"])
  expect(await bob.client.notes.list()).toEqual([])
  await expect(
    app.services.auth.api.setActiveOrganization({
      body: { organizationId: created.response.id },
      headers: bob.headers,
    }),
  ).rejects.toThrow()
})
// @end

// @findplate:feedback
test("feedback: a bot filling the honeypot is dropped quietly, and without GitHub keys it says so", async () => {
  expect(await app.anonymous.feedback.send({ message: "buy cheap watches", website: "http://spam" })).toEqual({
    ok: true,
  })
  await expect(app.anonymous.feedback.send({ message: "a real remark" })).rejects.toMatchObject({
    code: "SERVICE_UNAVAILABLE",
  })
})
// @end
