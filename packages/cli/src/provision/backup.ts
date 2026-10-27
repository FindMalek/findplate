import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { templateDir } from "../paths"
import { ghSet, secret } from "./secrets"
import type { Ctx, Task } from "./task"

export const BACKUP_WORKFLOW = join(".github", "workflows", "backup.yml")

/** Copies the nightly workflow when missing and stores the connection string it dumps. Bucket secrets come from `provision s3`. */
export function planBackup(ctx: Ctx): Task[] {
  return [
    {
      id: "backup:workflow",
      title: `Nightly pg_dump to S3: ${BACKUP_WORKFLOW} and GitHub ${ctx.repo} secret BACKUP_DATABASE_URL`,
      async run() {
        const target = join(ctx.dir, BACKUP_WORKFLOW)
        if (!existsSync(target)) {
          mkdirSync(dirname(target), { recursive: true })
          copyFileSync(join(templateDir(), BACKUP_WORKFLOW), target)
        }
        ghSet("secret", ctx.repo, "BACKUP_DATABASE_URL", await secret("BACKUP_DATABASE_URL", "Production database url"))
      },
    },
  ]
}
