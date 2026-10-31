import { expect, test } from "bun:test"
import { z } from "zod"
import { defineJob } from "./define"
import { JOBS } from "./jobs"
import { createTriggerJobs, type TriggerClient, triggerRetry } from "./trigger"
import * as tasks from "./trigger/tasks"

const greet = defineJob({
  name: "greet",
  description: "test job",
  payload: z.object({ name: z.string().min(1) }),
  handler: async () => {},
})

function fakeClient() {
  const triggered: [string, object][] = []
  const client: TriggerClient = {
    trigger: async (id, payload) => {
      triggered.push([id, payload])
      return { id: "run_1" }
    },
    count: async (_id, statuses) => (statuses.includes("FAILED") ? 2 : 0),
  }
  return { client, triggered }
}

test("enqueue checks the payload, then triggers the task", async () => {
  const { client, triggered } = fakeClient()
  const jobs = createTriggerJobs({ client, jobs: [greet] })
  expect((await jobs.enqueue("greet", { name: "" })).ok).toBe(false)
  expect((await jobs.enqueue("nope", {})).ok).toBe(false)
  expect(await jobs.enqueue("greet", { name: "ada" })).toEqual({ ok: true, id: "run_1" })
  expect(triggered).toEqual([["greet", { name: "ada" }]])
})

test("list reports run counts and retries map to trigger attempts", async () => {
  const { client } = fakeClient()
  const [info] = await createTriggerJobs({ client, jobs: [greet] }).list()
  expect(info).toMatchObject({ name: "greet", queued: 0, active: 0, failed: 2 })
  expect(triggerRetry({ limit: 2, delaySeconds: 10, backoff: true })).toMatchObject({
    maxAttempts: 3,
    minTimeoutInMs: 10_000,
    factor: 2,
  })
})

test("every job has an exported trigger task", () => {
  const ids = Object.values(tasks).map((task) => task.id)
  expect(ids.sort()).toEqual(JOBS.map((job) => job.name).sort())
})
