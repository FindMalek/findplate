/** Fills `.env.example` into a real `.env`: known keys get values, everything else keeps its example default. */
export function buildEnv(example: string, values: Record<string, string | undefined>): string {
  return example
    .split("\n")
    .map((line) => {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
      if (!match) return line
      const value = values[match[1]!]
      return value === undefined ? line : `${match[1]}=${value}`
    })
    .join("\n")
}
