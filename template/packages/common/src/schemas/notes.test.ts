import { expect, test } from "bun:test"
import { NOTE_TITLE_MAX } from "../constants"
import { noteInputSchema, noteUpdateSchema } from "./notes"

test("a note input trims the title and fills the defaults", () => {
  expect(noteInputSchema.parse({ title: "  hello  " })).toEqual({ title: "hello", body: "", pinned: false })
})

test("a note needs a real title that fits", () => {
  expect(noteInputSchema.safeParse({ title: "   " }).success).toBe(false)
  expect(noteInputSchema.safeParse({ title: "x".repeat(NOTE_TITLE_MAX + 1) }).success).toBe(false)
})

test("an update needs a uuid id and may carry any subset of fields", () => {
  const id = crypto.randomUUID()
  expect(noteUpdateSchema.parse({ id, pinned: true })).toEqual({ id, pinned: true })
  expect(noteUpdateSchema.safeParse({ id: "1", pinned: true }).success).toBe(false)
})
