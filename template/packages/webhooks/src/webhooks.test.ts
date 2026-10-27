import { expect, test } from "bun:test"
import { hmacSha256, verifyHmac, verifySecretHeader, verifySvix, verifyTimestamped } from "./index"

const NOW = new Date("2026-01-01T00:00:00Z")
const now = () => NOW
const ts = String(NOW.getTime() / 1000)

test("secret header must match exactly", () => {
  const request = (value: string) => new Request("https://api.test", { headers: { "x-secret": value } })
  expect(verifySecretHeader(request("s3cret"), "x-secret", "s3cret")).toBe(true)
  expect(verifySecretHeader(request("s3cre"), "x-secret", "s3cret")).toBe(false)
  expect(verifySecretHeader(request("s3cret"), "x-secret", undefined)).toBe(false)
})

test("hmac accepts a sha256= prefix and rejects a tampered body", () => {
  const signature = `sha256=${hmacSha256("key", "{}")}`
  expect(verifyHmac({ secret: "key", body: "{}", signature })).toBe(true)
  expect(verifyHmac({ secret: "key", body: '{"a":1}', signature })).toBe(false)
})

test("timestamped signatures expire", () => {
  const signature = hmacSha256("key", `${ts}.{}`)
  expect(verifyTimestamped({ secret: "key", body: "{}", signature, timestamp: ts, now })).toBe(true)
  const later = () => new Date(NOW.getTime() + 10 * 60 * 1000)
  expect(verifyTimestamped({ secret: "key", body: "{}", signature, timestamp: ts, now: later })).toBe(false)
})

test("svix signatures verify with any listed v1 entry", () => {
  const secret = `whsec_${Buffer.from("topsecret").toString("base64")}`
  const signature = hmacSha256(Buffer.from("topsecret"), `msg_1.${ts}.{}`, "base64")
  const headers = new Headers({
    "svix-id": "msg_1",
    "svix-timestamp": ts,
    "svix-signature": `v1,bogus v1,${signature}`,
  })
  expect(verifySvix({ secret, headers, body: "{}", now })).toBe(true)
  expect(verifySvix({ secret, headers, body: "{ }", now })).toBe(false)
  const later = () => new Date(NOW.getTime() + 10 * 60 * 1000)
  expect(verifySvix({ secret, headers, body: "{}", now: later })).toBe(false)
})
