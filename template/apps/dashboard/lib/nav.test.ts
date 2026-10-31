import { expect, test } from "bun:test"
import { visibleNav } from "./nav"

test("admin pages only show for admins", () => {
  const hrefs = (role: string | null) => visibleNav(role).map((item) => item.href)
  expect(hrefs(null)).not.toContain("/users")
  expect(hrefs("admin")).toContain("/users")
})
