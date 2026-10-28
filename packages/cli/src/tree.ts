import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import type { Tree } from "./add-plan"

/** Never copied from the regenerated project: local secrets, state, the lockfile pnpm owns, build output. */
const IGNORED = new Set([
  ".env",
  ".findplate",
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  ".git",
  ".vercel",
  "pnpm-lock.yaml",
])

export function readTree(root: string): Tree {
  const tree = new Map<string, string>()
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (IGNORED.has(entry.name) || entry.name.endsWith(".tsbuildinfo") || entry.name === "next-env.d.ts") continue
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else tree.set(relative(root, path), createHash("sha1").update(readFileSync(path)).digest("hex"))
    }
  }
  if (existsSync(root)) walk(root)
  return tree
}
