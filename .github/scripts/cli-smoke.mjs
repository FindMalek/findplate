// Runs the built cli (`node packages/cli/dist/index.js`) the way a user would, on whatever OS and node runs this.
// usage: node .github/scripts/cli-smoke.mjs [path to dist/index.js]
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const dist = resolve(process.argv[2] ?? "packages/cli/dist/index.js")
const work = mkdtempSync(join(tmpdir(), "findplate-smoke-"))

function cli(args, cwd = work) {
  const result = spawnSync(process.execPath, [dist, ...args, "--no-update-check"], { cwd, encoding: "utf8" })
  if (result.error) throw result.error
  return result
}

function fail(message, result) {
  console.error(`${message}\n${result ? `exit ${result.status}\n${result.stdout}\n${result.stderr}` : ""}`)
  process.exitCode = 1
}

try {
  console.log(`node ${process.version} on ${process.platform}`)
  const version = cli(["--version"])
  if (version.status !== 0 || !version.stdout.trim()) fail("--version failed", version)

  for (const [name, modules, owned] of [
    ["minimum", "", "packages/ai"],
    ["withai", "ai", "packages/ai"],
  ]) {
    const created = cli([
      "create",
      name,
      "-y",
      "--no-install",
      "--no-git",
      "--no-agents",
      "--no-skills",
      `--modules=${modules}`,
    ])
    if (created.status !== 0) {
      fail(`create ${name} failed`, created)
      continue
    }
    const project = join(work, name)
    for (const file of ["package.json", ".env", ".env.example", ".findplate/state.json", "apps/web/package.json"]) {
      if (!existsSync(join(project, file))) fail(`${name}: ${file} is missing`)
    }
    if (existsSync(join(project, owned)) !== Boolean(modules))
      fail(`${name}: ${owned} should ${modules ? "exist" : "be absent"}`)
    const env = readFileSync(join(project, ".env"), "utf8")
    if (/^BETTER_AUTH_SECRET=\s*$/m.test(env) || !/^BETTER_AUTH_SECRET=\S+/m.test(env))
      fail(`${name}: .env has no generated secret`)

    // No database runs here, so doctor may exit 1; it must still report json with the project check passing.
    const doctor = cli(["doctor", project, "--json"])
    let report
    try {
      report = JSON.parse(doctor.stdout)
    } catch {
      fail(`doctor ${name} printed no json`, doctor)
      continue
    }
    const project_ = report.results.find((entry) => entry.id === "project")
    if (project_?.status !== "pass") fail(`doctor ${name}: project check is ${project_?.status}`, doctor)
    if (!report.results.some((entry) => entry.id === "node" && entry.status === "pass"))
      fail(`doctor ${name}: node check`, doctor)
  }
} finally {
  rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
if (process.exitCode) process.exit(process.exitCode)
console.log("cli smoke ok")
