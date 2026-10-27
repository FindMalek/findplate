import { spawn } from "node:child_process"
import { createServer } from "node:net"

/** Runs a command, keeping its output for the error message instead of flooding the prompt UI. */
export function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let output = ""
    child.stdout.on("data", (chunk) => (output += chunk))
    child.stderr.on("data", (chunk) => (output += chunk))
    child.on("error", reject)
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${cmd} ${args.join(" ")} failed:\n${output.split("\n").slice(-25).join("\n")}`)),
    )
  })
}

export function has(cmd: string): Promise<boolean> {
  return run(cmd, ["--version"], process.cwd()).then(
    () => true,
    () => false,
  )
}

/** First free TCP port from `start`, so a new project's postgres never fights an existing one. */
export async function freePort(start: number): Promise<number> {
  for (let port = start; port < start + 200; port++) {
    const free = await new Promise<boolean>((resolve) => {
      const server = createServer()
      server.once("error", () => resolve(false))
      // Docker publishes on every interface, so the port must be free on 0.0.0.0, not just localhost.
      server.listen(port, "0.0.0.0", () => server.close(() => resolve(true)))
    })
    if (free) return port
  }
  return start
}
