import { expect, test } from "bun:test"
import type { Db } from "@acme/db"
import { z } from "zod"
import { type Boss, createJobs, defineJob } from "./index"

const handled: string[] = []
const greet = defineJob({
  name: "greet",
  description: "test job",
  payload: z.object({ name: z.string().min(1) }),
  cron: "*/5 * * * *",
  scheduleData: { name: "cron" },
  retry: { limit: 2, delaySeconds: 10, backoff: true },
  handler: async ({ name }) => {
    handled.push(name)
  },
})

function fakeBoss() {
  const calls: { sent: unknown[][]; scheduled: unknown[][]; worked: string[] } = { sent: [], scheduled: [], worked: [] }
  let handler: Parameters<Boss["work"]>[1] = async () => {}
  const boss: Boss = {
    start: async () => {},
    stop: async () => {},
    createQueue: async () => {},
    work: async (name, fn) => {
      calls.worked.push(name)
      handler = fn
      return "worker-1"
    },
    schedule: async (...args) => void calls.scheduled.push(args),
    send: async (...args) => {
      calls.sent.push(args)
      return "job-1"
    },
    getQueues: async () => [],
  }
  return { boss, calls, run: (data: object) => handler([{ id: "job-1", data }]) }
}

const options = { db: {} as Db, jobs: [greet] }

test("enqueue checks the payload, applies the retry policy and the worker runs the parsed job", async () => {
  const { boss, calls, run } = fakeBoss()
  const jobs = createJobs({ ...options, boss })
  await jobs.start()

  expect(await jobs.enqueue("greet", { name: "ada" })).toEqual({ ok: true, id: "job-1" })
  expect(calls.sent[0]).toEqual(["greet", { name: "ada" }, { retryLimit: 2, retryDelay: 10, retryBackoff: true }])
  expect(calls.scheduled[0]?.slice(0, 3)).toEqual(["greet", "*/5 * * * *", { name: "cron" }])

  await run({ name: "ada" })
  expect(handled).toEqual(["ada"])

  expect(await jobs.enqueue("greet", { name: "" })).toMatchObject({ ok: false })
  expect(await jobs.enqueue("nope", {})).toEqual({ ok: false, error: 'Unknown job "nope".' })
  expect(calls.sent).toHaveLength(1)
})

test("an enqueue-only process neither works nor schedules", async () => {
  const { boss, calls } = fakeBoss()
  await createJobs({ ...options, boss, worker: false }).start()
  expect(calls.worked).toEqual([])
  expect(calls.scheduled).toEqual([])
})
