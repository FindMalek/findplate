import { expect, test } from "bun:test"
import { atLeast, emptyRequired, exitCode, hostPort, missingKeys, parseEnv, requiredKeys } from "../src/doctor-plan"
import { securityChecks } from "../src/security-plan"

test("env checks find missing keys and empty required schema keys", () => {
  expect(missingKeys("A=1\nB=\n# C=3\n", "A=1\n")).toEqual(["B"])
  const schema = [
    "  DATABASE_URL: z.string().min(1),",
    "  PORT: z.coerce.number().default(3001),",
    "  TOKEN: optional,",
    "  SECRET: z.string().min(32),",
  ].join("\n")
  expect(requiredKeys(schema)).toEqual(["DATABASE_URL", "SECRET"])
  expect(emptyRequired(["DATABASE_URL", "SECRET"], parseEnv("DATABASE_URL=x\nSECRET=\n"))).toEqual(["SECRET"])
})

test("security checks flag weak secrets, open signup in production and committed .env", () => {
  const good = {
    env: { BETTER_AUTH_SECRET: "x".repeat(44).replace(/x/g, "a1"), ADMIN_PASSWORD: "k3j2h4g5f6d7" },
    authSource: "emailAndPassword: { enabled: true, disableSignUp: true }",
    nextConfigs: { "apps/web/next.config.ts": 'key: "Content-Security-Policy"' },
    envTracked: false,
    rateLimited: true,
  }
  expect(exitCode(securityChecks(good))).toBe(0)
  const bad = securityChecks({
    ...good,
    env: { BETTER_AUTH_SECRET: "changeme", ADMIN_PASSWORD: "admin", DASHBOARD_URL: "https://app.example.com" },
    authSource: "emailAndPassword: { enabled: true }",
    nextConfigs: { "apps/web/next.config.ts": "export default {}" },
    envTracked: true,
    rateLimited: false,
  })
  expect(bad.filter((r) => r.status === "fail").map((r) => r.id)).toEqual([
    "sec-secret",
    "sec-admin",
    "sec-signup",
    "sec-headers",
    "sec-env",
    "sec-rate-limit",
  ])
  expect(exitCode(bad)).toBe(1)
})

test("versions, db targets and exit code", () => {
  expect(atLeast("v22.1.0", "20")).toBe(true)
  expect(atLeast("18.19.0", "20")).toBe(false)
  expect(hostPort("postgres://u:p@localhost:5433/db")).toEqual({ host: "localhost", port: 5433 })
  const check = (status: "pass" | "warn" | "fail") => ({ id: "x", label: "x", status, detail: "" })
  expect(exitCode([check("pass"), check("warn")])).toBe(0)
  expect(exitCode([check("pass"), check("fail")])).toBe(1)
})
