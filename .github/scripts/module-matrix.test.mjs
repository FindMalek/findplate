import { expect, test } from "bun:test"
import { buildMatrix } from "./module-matrix.mjs"

const manifest = { modules: { ai: {}, langfuse: { requires: ["ai"] }, docs: {} } }

test("every module alone with requires, plus all and minimum", () => {
  const { include } = buildMatrix(manifest, { fullBuild: false })
  expect(include.map((i) => i.name)).toEqual(["all modules", "minimum", "ai", "langfuse", "docs"])
  expect(include.find((i) => i.name === "langfuse")?.modules).toBe("ai,langfuse")
  expect(include.find((i) => i.name === "docs")?.build).toBe(false)
  expect(include.find((i) => i.name === "minimum")?.build).toBe(true)
})
