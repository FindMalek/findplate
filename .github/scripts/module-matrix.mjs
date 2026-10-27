import { appendFileSync, readFileSync } from "node:fs"

export function resolveModules(modules, id, seen = new Set()) {
  if (seen.has(id)) return []
  seen.add(id)
  const required = modules[id]?.requires ?? []
  return [...required.flatMap((r) => resolveModules(modules, r, seen)), id]
}

export function buildMatrix(manifest, { fullBuild }) {
  const modules = manifest.modules
  const ids = Object.keys(modules)
  const alone = ids.map((id) => ({
    name: id,
    modules: [...new Set(resolveModules(modules, id))].join(","),
    build: fullBuild,
  }))
  return {
    include: [
      { name: "all modules", modules: ids.join(","), build: true },
      { name: "minimum", modules: "", build: true },
      ...alone,
    ],
  }
}

if (import.meta.main) {
  const manifest = JSON.parse(readFileSync(process.argv[2] ?? "template/findplate.json", "utf8"))
  const fullBuild = process.env.EVENT_NAME !== "pull_request"
  const matrix = JSON.stringify(buildMatrix(manifest, { fullBuild }))
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${matrix}\n`)
  else console.log(matrix)
}
