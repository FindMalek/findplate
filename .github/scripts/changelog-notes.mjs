import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

export function releaseNotes(changelog, version) {
  const lines = changelog.split("\n")
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`))
  if (start === -1) return null
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^(## |\[[^\]]+\]: )/.test(line))
  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim() || null
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const notes = releaseNotes(readFileSync(process.argv[3] ?? "CHANGELOG.md", "utf8"), process.argv[2])
  if (!notes) {
    console.error(`no CHANGELOG.md entry for ${process.argv[2]}`)
    process.exit(1)
  }
  console.log(notes)
}
