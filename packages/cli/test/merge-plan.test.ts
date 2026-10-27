import { expect, test } from "bun:test"
import { mergeFile, planFile } from "../src/merge-plan"

const b = (text: string) => Buffer.from(text)

test("only files the template changed are touched, and edited ones are merged", () => {
  expect(planFile({ base: b("a"), next: b("a"), ours: b("mine") })).toBe("keep")
  expect(planFile({ base: b("a"), next: b("b"), ours: b("a") })).toBe("update")
  expect(planFile({ base: b("a"), ours: b("a") })).toBe("delete")
  expect(planFile({ next: b("b") })).toBe("add")
  expect(planFile({ base: b("a"), next: b("b") })).toBe("conflict")
  expect(planFile({ base: b("a"), ours: b("mine") })).toBe("conflict")
  expect(planFile({ base: b("a\n"), next: b("a\nb\n"), ours: b("z\na\n") })).toBe("merge")
  expect(planFile({ base: b("a"), next: b("b"), ours: Buffer.from([0, 1]) })).toBe("conflict")
})

test("merge keeps both edits, and reports overlapping ones as conflicts", () => {
  const clean = mergeFile({ base: b("1\n2\n3\n"), ours: b("0\n1\n2\n3\n"), next: b("1\n2\n3\n4\n") })
  expect(clean.conflicts).toBe(0)
  expect(clean.content.toString()).toBe("0\n1\n2\n3\n4\n")
  const clash = mergeFile({ base: b("x\n"), ours: b("mine\n"), next: b("theirs\n") })
  expect(clash.conflicts).toBe(1)
  expect(clash.content.toString()).toContain("<<<<<<< yours")
})
