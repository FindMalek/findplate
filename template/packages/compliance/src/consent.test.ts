import { expect, test } from "bun:test"
import { consentCookie, parseConsent } from "./consent"

test("only the two known values count as a choice", () => {
  expect(parseConsent("granted")).toBe("granted")
  expect(parseConsent("denied")).toBe("denied")
  expect(parseConsent("yes")).toBeNull()
  expect(parseConsent(undefined)).toBeNull()
  expect(consentCookie("granted")).toContain("consent=granted;")
})
