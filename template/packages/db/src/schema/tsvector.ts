import { customType } from "drizzle-orm/pg-core"

/** Postgres' full-text type, filled by a generated column. */
export const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" })
