import { expect, test } from "bun:test"
import { loadApiEnv } from "./api"

const required = { DATABASE_URL: "postgres://localhost/app", BETTER_AUTH_SECRET: "s".repeat(32) }

test("only the database url and the auth secret are required", () => {
  expect(() => loadApiEnv({})).toThrow(/DATABASE_URL[\s\S]*BETTER_AUTH_SECRET/)
  expect(() => loadApiEnv({ ...required, BETTER_AUTH_SECRET: "short" })).toThrow(/BETTER_AUTH_SECRET/)
  expect(loadApiEnv(required).DATABASE_URL).toBe(required.DATABASE_URL)
})

test("defaults fill in and numbers are coerced", () => {
  expect(loadApiEnv(required)).toMatchObject({ PORT: 3001, SEED: "demo", DEPLOY_ENV: "local" })
  expect(loadApiEnv({ ...required, PORT: "8080" }).PORT).toBe(8080)
})

test("empty strings count as unset, as they do in .env.example", () => {
  const env = loadApiEnv({ ...required, PORT: "", ADMIN_EMAIL: "", SEED: "" })
  expect(env).toMatchObject({ PORT: 3001, SEED: "demo" })
  expect(env.ADMIN_EMAIL).toBeUndefined()
})

test("a bad value names the variable", () => {
  expect(() => loadApiEnv({ ...required, SEED: "everything" })).toThrow(/SEED/)
})
