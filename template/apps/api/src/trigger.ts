import { connectTrigger, createTriggerJobs, type JobsRunner } from "@acme/jobs"

/** Jobs on trigger.dev: this process only enqueues, the handlers run on the trigger.dev side. */
export function startTriggerJobs(options: { secretKey: string; apiUrl?: string }): JobsRunner {
  return createTriggerJobs({ client: connectTrigger(options) })
}
