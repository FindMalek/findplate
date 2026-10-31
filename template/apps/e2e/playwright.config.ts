import { defineConfig } from "@playwright/test"
import { BASE_DATABASE_URL, e2eDatabaseUrl, URLS } from "./env"

const shared = {
  API_URL: URLS.api,
  API_PUBLIC_URL: URLS.api,
  WEB_URL: URLS.web,
  DASHBOARD_URL: URLS.dashboard,
}
const port = (url: string) => new URL(url).port
const BUILD_TIMEOUT = 10 * 60_000

/** Production builds of both apps plus the api on a fresh database: what a deploy runs, minus the network. */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure" },
  webServer: [
    {
      command: "bun prepare-db.ts && cd ../api && bun src/index.ts",
      url: `${URLS.api}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: "pipe",
      env: {
        ...shared,
        E2E_DATABASE_URL: BASE_DATABASE_URL,
        DATABASE_URL: e2eDatabaseUrl(),
        BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-0123",
        PORT: port(URLS.api),
        SEED: "none",
        DEPLOY_ENV: "e2e",
      },
    },
    {
      command: `pnpm --filter web exec next build && pnpm --filter web exec next start --port ${port(URLS.web)}`,
      url: URLS.web,
      timeout: BUILD_TIMEOUT,
      reuseExistingServer: false,
      env: shared,
    },
    {
      command: `pnpm --filter dashboard exec next build && pnpm --filter dashboard exec next start --port ${port(URLS.dashboard)}`,
      url: `${URLS.dashboard}/sign-in`,
      timeout: BUILD_TIMEOUT,
      reuseExistingServer: false,
      env: shared,
    },
  ],
})
