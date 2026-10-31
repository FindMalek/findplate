import { expect, test } from "bun:test"
import { createFeedbackIssue } from "./feedback"

test("feedback opens a labelled issue with the sender and page", async () => {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return Response.json({ number: 42 })
  }) as unknown as typeof globalThis.fetch

  const number = await createFeedbackIssue(
    { repo: "acme/app", token: "t", fetch },
    { message: "The export button is hard to find", email: "ada@acme.test", page: "/notes" },
  )

  expect(number).toBe(42)
  expect(calls[0]?.url).toBe("https://api.github.com/repos/acme/app/issues")
  const body = JSON.parse(String(calls[0]?.init.body))
  expect(body.labels).toEqual(["feedback"])
  expect(body.body).toContain("From: ada@acme.test")
  expect(body.body).toContain("Page: /notes")
})
