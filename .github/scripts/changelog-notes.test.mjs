import { expect, test } from "bun:test"
import { releaseNotes } from "./changelog-notes.mjs"

const log =
  "# Changelog\n\n## [Unreleased]\n\n## [0.2.0]\n\n### Added\n\n- b\n\n## [0.1.0]\n\n- a\n\n[0.1.0]: https://x\n"

test("takes the section of one version", () => {
  expect(releaseNotes(log, "0.2.0")).toBe("### Added\n\n- b")
  expect(releaseNotes(log, "0.1.0")).toBe("- a")
  expect(releaseNotes(log, "9.9.9")).toBeNull()
})
