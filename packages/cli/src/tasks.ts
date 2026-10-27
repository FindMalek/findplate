import * as p from "@clack/prompts"

/** Spinners in a terminal, one plain line per step otherwise (agents and CI logs). */
export async function runTasks(steps: p.Task[], tty = Boolean(process.stdout.isTTY)) {
  if (tty) return p.tasks(steps)
  for (const step of steps) {
    if (step.enabled === false) continue
    const result = await step.task(() => {})
    console.info(`- ${typeof result === "string" ? result : step.title}`)
  }
}
