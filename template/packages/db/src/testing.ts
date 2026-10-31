import postgres from "postgres"
import { createDb, type Db } from "./index"
import { runMigrations } from "./migrate"

const FALLBACK = "postgres://acme:acme@localhost:5432/acme"

export interface TestDb {
  db: Db
  url: string
  /** Closes the connections and drops the database. */
  close: () => Promise<void>
}

/**
 * A fresh, fully migrated database on the server `TEST_DATABASE_URL` (or `DATABASE_URL`) points at, so tests never
 * touch your data and never see each other's. Start one with `pnpm db:up`.
 */
export async function createTestDb(): Promise<TestDb> {
  const base = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || FALLBACK)
  const name = `test_${crypto.randomUUID().replaceAll("-", "")}`
  const admin = postgres(base.toString(), { max: 1, onnotice: () => {} })
  try {
    await admin.unsafe(`create database ${name}`)
  } catch (error) {
    await admin.end()
    throw new Error(`Tests need Postgres at ${base.host}. Start it with \`pnpm db:up\` or set TEST_DATABASE_URL.`, {
      cause: error,
    })
  }
  const url = new URL(base)
  url.pathname = `/${name}`
  const db = createDb(url.toString())
  await runMigrations(db)
  return {
    db,
    url: url.toString(),
    async close() {
      await db.close()
      await admin.unsafe(`drop database ${name} with (force)`)
      await admin.end()
    },
  }
}
