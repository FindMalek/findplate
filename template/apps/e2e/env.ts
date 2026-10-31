/** Ports and origins the smoke test runs on, away from the dev ports so both can run at once. */
export const URLS = {
  web: "http://localhost:4100",
  api: "http://localhost:4101",
  dashboard: "http://localhost:4102",
}

/** The server Postgres runs on (`pnpm db:up`). The test uses its own database on it, recreated every run. */
export const BASE_DATABASE_URL =
  process.env.E2E_DATABASE_URL || process.env.DATABASE_URL || "postgres://acme:acme@localhost:5432/acme"

export const E2E_DATABASE = "acme_e2e"

export function e2eDatabaseUrl(): string {
  const url = new URL(BASE_DATABASE_URL)
  url.pathname = `/${E2E_DATABASE}`
  return url.toString()
}
