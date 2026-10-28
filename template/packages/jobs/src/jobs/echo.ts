import { z } from "zod"
import { defineJob } from "../define"

/** A job with a payload and no side effect: enqueue it from the admin procedure to see the worker run. */
export const echo = defineJob({
  name: "echo",
  description: "Log a message",
  payload: z.object({ message: z.string().min(1).max(200) }),
  retry: { limit: 0, delaySeconds: 0, backoff: false },
  handler: async ({ message }, { jobId }) => {
    console.info(`echo ${jobId}: ${message}`)
  },
})
