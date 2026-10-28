import { expect, test } from "@playwright/test"
import { URLS } from "../env"

const PASSWORD = "correct horse battery"

test("the landing page renders its hero", async ({ page }) => {
  const response = await page.goto(URLS.web)
  expect(response?.status()).toBe(200)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible()
  await expect(page.getByText(/^ok · \d+ ms$/)).toBeVisible()
})

test("both apps reach the api through /api/health", async ({ request }) => {
  for (const origin of [URLS.web, URLS.dashboard]) {
    const response = await request.get(`${origin}/api/health`)
    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, db: true, env: "e2e" })
  }
})

test("sign up, sign out, sign in, then create and list a note", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`

  await page.goto(`${URLS.dashboard}/sign-up`)
  await page.getByLabel("Name").fill("E2E")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByText(email)).toBeVisible()

  await page.getByRole("button", { name: new RegExp(email) }).click()
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByText(email)).toBeVisible()

  await page.goto(`${URLS.dashboard}/notes`)
  await expect(page.getByText("No notes yet")).toBeVisible()
  await page.getByLabel("Title").fill("Smoke note")
  await page.getByRole("button", { name: "Add note" }).click()
  await expect(page.getByText("Smoke note")).toBeVisible()
  await expect(page.getByText("No notes yet")).toBeHidden()

  await page.reload()
  await expect(page.getByText("Smoke note")).toBeVisible()
})
