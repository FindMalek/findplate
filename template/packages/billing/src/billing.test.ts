import { afterAll, beforeAll, expect, test } from "bun:test"
import { subscription, user } from "@acme/db"
import { createTestDb, type TestDb } from "@acme/db/testing"
import { hmacSha256 } from "@acme/webhooks"
import { eq } from "drizzle-orm"
import { createBilling } from "./index"

let testDb: TestDb
beforeAll(async () => {
  testDb = await createTestDb()
  await testDb.db.insert(user).values({ id: "u1", name: "Ada", email: "ada@acme.test" })
})
afterAll(() => testDb.close())

const NOW = new Date("2026-01-01T00:00:00Z")
const env = { STRIPE_SECRET_KEY: "sk_test", STRIPE_WEBHOOK_SECRET: "whsec_test", STRIPE_PRICE_PRO: "price_pro" }

function stripeRequest(id: string, status: string, created = NOW.getTime() / 1000) {
  const body = JSON.stringify({
    id,
    type: "customer.subscription.updated",
    created,
    data: {
      object: {
        id: "sub_1",
        customer: "cus_1",
        status,
        cancel_at_period_end: false,
        current_period_end: created + 3600,
        items: { data: [{ price: { id: "price_pro" } }] },
        metadata: { userId: "u1" },
      },
    },
  })
  const t = String(Math.floor(NOW.getTime() / 1000))
  const signature = hmacSha256(env.STRIPE_WEBHOOK_SECRET, `${t}.${body}`)
  return new Request("http://api/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": `t=${t},v1=${signature}` },
    body,
  })
}

test("stripe webhooks set the plan, once, and never from an older event", async () => {
  const billing = createBilling(env, testDb.db, { now: () => NOW })
  expect((await billing.status("u1")).plan).toBe("free")

  expect((await billing.handleWebhook(stripeRequest("evt_1", "active"))).status).toBe(200)
  expect(await billing.status("u1")).toMatchObject({ plan: "pro", status: "active", configured: true })

  await billing.handleWebhook(stripeRequest("evt_1", "canceled")) // same id again: ignored
  expect((await billing.status("u1")).plan).toBe("pro")

  await billing.handleWebhook(stripeRequest("evt_old", "canceled", NOW.getTime() / 1000 - 60)) // older: ignored
  expect((await billing.status("u1")).plan).toBe("pro")

  await billing.handleWebhook(stripeRequest("evt_2", "canceled", NOW.getTime() / 1000 + 60))
  expect((await billing.status("u1")).plan).toBe("free")
  const [row] = await testDb.db.select().from(subscription).where(eq(subscription.userId, "u1"))
  expect(row?.status).toBe("canceled")
})

test("a bad signature is a 400 and changes nothing", async () => {
  const billing = createBilling(env, testDb.db, { now: () => NOW })
  const forged = new Request("http://api/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": `t=${Math.floor(NOW.getTime() / 1000)},v1=nope` },
    body: "{}",
  })
  expect((await billing.handleWebhook(forged)).status).toBe(400)
})

test("stripe checkout posts the price and the user", async () => {
  const calls: { url: string; body: string }[] = []
  const fetch = async (url: string, init?: RequestInit) => {
    calls.push({ url, body: String(init?.body) })
    return Response.json({ url: "https://checkout.stripe.test/s" })
  }
  const billing = createBilling(env, testDb.db, { fetch })
  const url = await billing.checkout({ id: "u2", email: "b@acme.test" }, "pro", {
    success: "http://d/ok",
    cancel: "http://d/no",
  })
  expect(url).toBe("https://checkout.stripe.test/s")
  expect(calls[0]?.url).toBe("https://api.stripe.com/v1/checkout/sessions")
  const body = new URLSearchParams(calls[0]?.body)
  expect(body.get("line_items[0][price]")).toBe("price_pro")
  expect(body.get("subscription_data[metadata][userId]")).toBe("u2")
})

test("polar webhooks use the standard-webhooks signature", async () => {
  const secret = "polar_secret"
  const billing = createBilling(
    { POLAR_ACCESS_TOKEN: "t", POLAR_WEBHOOK_SECRET: secret, POLAR_PRODUCT_PRO: "prod_pro" },
    testDb.db,
    {
      now: () => NOW,
    },
  )
  const body = JSON.stringify({
    type: "subscription.active",
    timestamp: "2026-01-02T00:00:00Z",
    data: {
      id: "psub_1",
      status: "active",
      product_id: "prod_pro",
      customer_id: "pcus_1",
      current_period_end: "2026-02-01T00:00:00Z",
      cancel_at_period_end: false,
      customer: { external_id: "u1" },
    },
  })
  const ts = String(Math.floor(NOW.getTime() / 1000))
  const signature = hmacSha256(secret, `msg_1.${ts}.${body}`, "base64")
  const request = new Request("http://api/billing/webhook", {
    method: "POST",
    headers: { "webhook-id": "msg_1", "webhook-timestamp": ts, "webhook-signature": `v1,${signature}` },
    body,
  })
  expect((await billing.handleWebhook(request)).status).toBe(200)
  expect(await billing.status("u1")).toMatchObject({ plan: "pro", status: "active" })
})
