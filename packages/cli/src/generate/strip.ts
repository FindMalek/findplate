import { toLf } from "../platform"

const START = /^\s*(?:\/\/|#|\{\/\*|<!--)\s*@findplate:([\w|-]+)\s*(?:\*\/\}|-->)?\s*$/
const END = /^\s*(?:\/\/|#|\{\/\*|<!--)\s*@end\s*(?:\*\/\}|-->)?\s*$/
/** One line owned by a module: `import { x } from "y" // @findplate:ai`. Import sorting keeps these attached. */
const INLINE = /^(.*\S)\s*\/\/\s*@findplate:([\w|-]+)\s*$/

const isOn = (names: string, enabled: ReadonlySet<string>) => names.split("|").some((name) => enabled.has(name))

/**
 * Keeps the code inside `@findplate:<module>` … `@end` markers when the module is enabled and drops it when not.
 * The marker lines themselves always go. Markers can be `//`, `#`, `{/* … *\/}` or `<!-- … -->` comments; they don't nest. A
 * trailing `// @findplate:<module>` marks a single line instead. `a|b` keeps the code when either module is on.
 */
export function stripModules(source: string, enabled: ReadonlySet<string>): string {
  if (!source.includes("@findplate:")) return source
  if (source.includes("\r\n")) return stripModules(toLf(source), enabled).replaceAll("\n", "\r\n")
  const out: string[] = []
  let skipping: string | null = null
  let open: string | null = null
  let removed = false
  for (const line of source.split("\n")) {
    const start = line.match(START)
    if (start) {
      if (open) throw new Error(`nested @findplate:${start[1]} inside @findplate:${open}`)
      open = start[1]!
      skipping = isOn(open, enabled) ? null : open
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
      if (!skipping && isOn(inline[2]!, enabled)) out.push(inline[1]!)
      else removed = true
      continue
    }
    if (skipping) removed = true
    else out.push(line)
  }
  if (open) throw new Error(`@findplate:${open} is never closed with @end`)
  return (removed ? tidyBlankLines(out) : out).join("\n")
}

/** Dropping a block can leave doubled blank lines or one next to a bracket; the formatter would reject both. */
function tidyBlankLines(lines: string[]): string[] {
  const kept: string[] = []
  for (const [index, line] of lines.entries()) {
    if (line.trim() === "") {
      const before = kept[kept.length - 1]?.trimEnd()
      const next = lines.slice(index + 1).find((candidate) => candidate.trim() !== "")
      if (before === "" || (before !== undefined && /[{([]$/.test(before))) continue
      if (next !== undefined && /^\s*[})\]]/.test(next)) continue
    }
    kept.push(line)
  }
  return kept
}
