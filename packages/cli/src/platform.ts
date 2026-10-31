export interface SpawnPlan {
  cmd: string
  args: string[]
  shell: boolean
}

/** Node-installed tools that Windows exposes as `.cmd` files. Real executables (git, gh, tar, bun) spawn directly. */
const CMD_SHIMS = new Set(["pnpm", "npm", "npx", "yarn", "corepack", "ruler"])

const NEEDS_QUOTES = /[\s"&|<>^()%!]/

/**
 * pnpm, npm and npx are `.cmd` shims on Windows. Node refuses to spawn those without a shell (EINVAL since 20.12),
 * so they go through cmd.exe with the arguments quoted by hand.
 */
export function spawnPlan(cmd: string, args: string[], platform: NodeJS.Platform = process.platform): SpawnPlan {
  if (platform !== "win32" || !CMD_SHIMS.has(cmd)) return { cmd, args, shell: false }
  const quote = (arg: string) => (NEEDS_QUOTES.test(arg) ? `"${arg.replaceAll('"', '\\"')}"` : arg)
  return { cmd, args: args.map(quote), shell: true }
}

/** Template files are checked out with CRLF on Windows (`core.autocrlf`); parsing works on LF. */
export const toLf = (text: string) => text.replaceAll("\r\n", "\n")

/** Project-relative paths use `/` everywhere (manifest, state), whatever the OS separator is. */
export const toPosix = (path: string) => path.replaceAll("\\", "/")

/** Windows keeps files locked for a moment (antivirus, indexers), so removing temp folders retries. */
export const RM_OPTIONS = { recursive: true, force: true, maxRetries: 5, retryDelay: 100 } as const
