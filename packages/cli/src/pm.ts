export type PackageManager = "pnpm" | "npm" | "yarn" | "bun"

/** First token of `npm_config_user_agent` (`pnpm/9.1.0 npm/? node/v22 ...`), falling back to pnpm. */
export function detectPackageManager(userAgent = process.env.npm_config_user_agent): PackageManager {
  const name = userAgent?.split(" ")[0]?.split("/")[0]
  return name === "npm" || name === "yarn" || name === "bun" || name === "pnpm" ? name : "pnpm"
}

export const installCommand = (pm: PackageManager) => `${pm} install`

/** How to run a package.json script: `npm run dev`, `pnpm dev`. */
export const scriptCommand = (pm: PackageManager, script: string) =>
  pm === "npm" || pm === "bun" ? `${pm} run ${script}` : `${pm} ${script}`

/** The template is a pnpm workspace, so every package manager still needs pnpm installed. */
export function pnpmHint(hasPnpm: boolean): string | undefined {
  return hasPnpm
    ? undefined
    : "pnpm is missing and this project is a pnpm workspace. Install it with: corepack enable pnpm"
}
