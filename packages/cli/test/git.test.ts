import { expect, test } from "bun:test"
import { planGitInit } from "../src/git"

test("git init is skipped inside a repo or without git, and follows init.defaultBranch", () => {
  expect(planGitInit({ installed: true, insideRepo: true })).toEqual({ action: "skip", reason: "existing" })
  expect(planGitInit({ installed: false, insideRepo: false })).toEqual({ action: "skip", reason: "missing" })
  expect(planGitInit({ installed: true, insideRepo: false, defaultBranch: "trunk" })).toEqual({
    action: "init",
    branch: "trunk",
  })
  expect(planGitInit({ installed: true, insideRepo: false })).toEqual({ action: "init", branch: "main" })
})
