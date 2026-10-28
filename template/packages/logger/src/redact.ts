const SECRET_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|credential|session|dsn/i
const MAX_DEPTH = 6

export const REDACTED = "[redacted]"

/** Copies `value` with every secret-looking key blanked and errors flattened, so a log line can't leak a credential. */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) {
    const extra = redact({ ...value }, depth + 1, seen) as Record<string, unknown>
    return { name: value.name, message: value.message, stack: value.stack, ...extra }
  }
  if (value === null || typeof value !== "object") return typeof value === "bigint" ? value.toString() : value
  if (value instanceof Headers) return redact(Object.fromEntries(value.entries()), depth, seen)
  if (value instanceof Date) return value.toISOString()
  if (seen.has(value) || depth >= MAX_DEPTH) return "[truncated]"
  seen.add(value)
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1, seen))
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    out[key] = SECRET_KEY.test(key) ? REDACTED : redact(item, depth + 1, seen)
  }
  return out
}
