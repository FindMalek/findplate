/** Exit codes, documented in docs/cli.mdx. */
export const EXIT = { ok: 0, failure: 1, usage: 2, dirty: 3 } as const

export class CliError extends Error {
  constructor(
    message: string,
    readonly code: number = EXIT.failure,
  ) {
    super(message)
  }
}
