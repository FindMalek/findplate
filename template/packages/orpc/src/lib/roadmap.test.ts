import { expect, test } from "bun:test"
import { toRoadmap } from "./roadmap"

const milestone = (title: string, closed: number, open: number, due: string | null) => ({
  title,
  description: null,
  html_url: `https://example.com/${title}`,
  state: "open" as const,
  open_issues: open,
  closed_issues: closed,
  due_on: due,
})

test("roadmap orders by due date, undated last, and computes progress", () => {
  const roadmap = toRoadmap([
    milestone("later", 0, 0, null),
    milestone("second", 1, 3, "2026-12-01T00:00:00Z"),
    milestone("first", 3, 1, "2026-11-01T00:00:00Z"),
  ])
  expect(roadmap.map((m) => m.title)).toEqual(["first", "second", "later"])
  expect(roadmap.map((m) => m.progress)).toEqual([75, 25, 0])
})
