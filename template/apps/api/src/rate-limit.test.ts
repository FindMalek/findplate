import { expect, test } from "bun:test"
import { createRateLimiter } from "@acme/orpc"
import { limitAuth } from "./rate-limit"

test("the 11th sign-in post from one ip in a minute is a 429, other ips are untouched", async () => {
  const services = { rateLimiter: createRateLimiter({}) }
  const post = (ip: string) =>
    limitAuth(
      services,
      new Request("http://api/auth/sign-in/email", { method: "POST", headers: { "x-forwarded-for": ip } }),
    )

  for (let i = 0; i < 10; i++) expect(await post("9.9.9.9")).toBeNull()
  const blocked = await post("9.9.9.9")
  expect(blocked?.status).toBe(429)
  expect(blocked?.headers.get("retry-after")).toBeString()
  expect(await post("8.8.8.8")).toBeNull()
})
