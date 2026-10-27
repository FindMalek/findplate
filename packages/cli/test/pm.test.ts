import { expect, test } from "bun:test"
import { detectPackageManager, scriptCommand } from "../src/pm"

test("package manager comes from the user agent and scripts use its run syntax", () => {
  expect(detectPackageManager("bun/1.2.0 npm/? node/v22.0.0 darwin arm64")).toBe("bun")
  expect(detectPackageManager("yarn/4.1.0 npm/? node/v22.0.0")).toBe("yarn")
  expect(detectPackageManager(undefined)).toBe("pnpm")
  expect(scriptCommand("npm", "dev")).toBe("npm run dev")
  expect(scriptCommand("bun", "build")).toBe("bun run build")
  expect(scriptCommand("yarn", "db:up")).toBe("yarn db:up")
})
