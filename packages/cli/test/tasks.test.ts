import { expect, spyOn, test } from "bun:test"
import { runTasks } from "../src/tasks"

test("without a tty each step is one plain line, in order, with its result", async () => {
  const info = spyOn(console, "info").mockImplementation(() => {})
  await runTasks(
    [
      { title: "Copying", task: async () => "Copied 12 files" },
      { title: "Formatting", task: async () => undefined },
    ],
    false,
  )
  expect(info.mock.calls.map((call) => call[0])).toEqual(["- Copied 12 files", "- Formatting"])
  info.mockRestore()
})
