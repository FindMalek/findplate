import { createHash, randomBytes } from "node:crypto"
import type { Session } from "@acme/auth"
import { apiKey, type Db, user } from "@acme/db"
import { and, eq, gt, isNull, lt, or } from "drizzle-orm"

export const API_KEY_SCOPES = ["read", "write"] as const
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number]

const TOUCH_AFTER_MS = 60_000

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex")

/** `ak_` + 32 random bytes. High entropy, so a plain sha256 is enough to store. */
export function generateKey(): { key: string; prefix: string; hash: string } {
  const key = `ak_${randomBytes(32).toString("base64url")}`
  return { key, prefix: key.slice(0, 10), hash: hashKey(key) }
}

export interface ApiKeyAuth {
  id: string
  scope: ApiKeyScope
  session: Session
}

/**
 * `Authorization: Bearer ak_...` to the key's owner. The session it returns never carries the admin role, so a leaked
 * key cannot reach admin procedures. Revoked, expired and unknown keys are simply not authenticated.
 */
export async function authenticateKey(db: Db, headers: Headers, now = new Date()): Promise<ApiKeyAuth | null> {
  const token = headers.get("authorization")?.match(/^Bearer (ak_\S+)$/)?.[1]
  if (!token) return null
  const [row] = await db
    .select({ key: apiKey, owner: user })
    .from(apiKey)
    .innerJoin(user, eq(user.id, apiKey.userId))
    .where(
      and(
        eq(apiKey.hash, hashKey(token)),
        isNull(apiKey.revokedAt),
        or(isNull(apiKey.expiresAt), gt(apiKey.expiresAt, now)),
      ),
    )
  if (!row || row.owner.banned) return null

  await db
    .update(apiKey)
    .set({ lastUsedAt: now })
    .where(
      and(
        eq(apiKey.id, row.key.id),
        or(isNull(apiKey.lastUsedAt), lt(apiKey.lastUsedAt, new Date(now.getTime() - TOUCH_AFTER_MS))),
      ),
    )

  const session = {
    session: {
      id: row.key.id,
      token: "",
      userId: row.owner.id,
      expiresAt: row.key.expiresAt ?? new Date(now.getTime() + TOUCH_AFTER_MS),
      createdAt: row.key.createdAt,
      updatedAt: row.key.createdAt,
      ipAddress: null,
      userAgent: null,
    },
    user: { ...row.owner, role: "user" },
  } as unknown as Session
  return { id: row.key.id, scope: row.key.scope === "write" ? "write" : "read", session }
}
