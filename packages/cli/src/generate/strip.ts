const START = /^\s*(?:\/\/|#|\{\/\*)\s*@findplate:([\w-]+)\s*(?:\*\/\})?\s*$/
const END = /^\s*(?:\/\/|#|\{\/\*)\s*@end\s*(?:\*\/\})?\s*$/
/** One line owned by a module: `import { x } from "y" // @findplate:ai`. Import sorting keeps these attached. */
const INLINE = /^(.*\S)\s*\/\/\s*@findplate:([\w-]+)\s*$/

/**
 * Keeps the code inside `@findplate:<module>` … `@end` markers when the module is enabled and drops it when not.
 * The marker lines themselves always go. Markers can be `//`, `#` or `{/* … *\/}` comments; they don't nest. A
 * trailing `// @findplate:<module>` marks a single line instead.
 */
export function stripModules(source: string, enabled: ReadonlySet<string>): string {
  if (!source.includes("@findplate:")) return source
  const out: string[] = []
  let skipping: string | null = null
  let open: string | null = null
  for (const line of source.split("\n")) {
    const start = line.match(START)
    if (start) {
      if (open) throw new Error(`nested @findplate:${start[1]} inside @findplate:${open}`)
      open = start[1]!
      skipping = enabled.has(open) ? null : open
      continue
    }
    if (END.test(line)) {
      if (!open) throw new Error("@end without a matching @findplate marker")
      open = null
      skipping = null
      continue
    }
    const inline = line.match(INLINE)
    if (inline) {
      if (!skipping && enabled.has(inline[2]!)) out.push(inline[1]!)
      continue
    }
    if (!skipping) out.push(line)
  }
  if (open) throw new Error(`@findplate:${open} is never closed with @end`)
  return out.join("\n")
}
