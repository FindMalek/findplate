import { createHmac, timingSafeEqual } from "node:crypto"

const DEFAULT_TOLERANCE_SECONDS = 300

/** Compares without leaking the length or the first differing byte. */
export function safeEqual(a: string, b: string): boolean {
  const left = createHmac("sha256", "compare").update(a).digest()
  const right = createHmac("sha256", "compare").update(b).digest()
  return timingSafeEqual(left, right)
}

/** Providers that send the shared secret as-is in a header (Telegram). */
export function verifySecretHeader(request: Request, header: string, secret: string | undefined): boolean {
  if (!secret) return false
  return safeEqual(request.headers.get(header) ?? "", secret)
}

export function hmacSha256(secret: string | Uint8Array, payload: string, encoding: "hex" | "base64" = "hex"): string {
  return createHmac("sha256", secret).update(payload).digest(encoding)
}

export interface SignedPayload {
  secret: string
  body: string
  /** As sent by the provider, with an optional `sha256=` prefix. */
  signature: string | null
  encoding?: "hex" | "base64"
}

/** HMAC sha256 of the raw body (GitHub style). Verify the raw text, not re-serialized json. */
export function verifyHmac({ secret, body, signature, encoding = "hex" }: SignedPayload): boolean {
  if (!secret || !signature) return false
  return safeEqual(signature.replace(/^sha256=/, ""), hmacSha256(secret, body, encoding))
}

export interface TimestampedPayload extends SignedPayload {
  /** Unix seconds, as sent by the provider. */
  timestamp: string | null
  /** Requests older (or newer) than this are rejected. */
  toleranceSeconds?: number
  now?: () => Date
}

/** Signs `<timestamp>.<body>`, so a captured request can't be replayed later. */
export function verifyTimestamped({
  timestamp,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
  now = () => new Date(),
  ...rest
}: TimestampedPayload): boolean {
  const sentAt = Number(timestamp)
  if (!timestamp || !Number.isFinite(sentAt)) return false
  if (Math.abs(now().getTime() / 1000 - sentAt) > toleranceSeconds) return false
  return verifyHmac({ ...rest, body: `${timestamp}.${rest.body}` })
}

export interface SvixOptions {
  /** The `whsec_...` signing secret. */
  secret: string
  headers: Headers
  body: string
  toleranceSeconds?: number
  now?: () => Date
}

/** Svix style (Resend, Clerk and others): signs `<id>.<timestamp>.<body>` with a base64 secret. */
export function verifySvix({
  secret,
  headers,
  body,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
  now = () => new Date(),
}: SvixOptions): boolean {
  const id = headers.get("svix-id")
  const timestamp = headers.get("svix-timestamp")
  const signatures = headers.get("svix-signature")
  if (!secret || !id || !timestamp || !signatures) return false
  const sentAt = Number(timestamp)
  if (!Number.isFinite(sentAt) || Math.abs(now().getTime() / 1000 - sentAt) > toleranceSeconds) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  const expected = hmacSha256(key, `${id}.${timestamp}.${body}`, "base64")
  return signatures.split(" ").some((part) => {
    const [version, value] = part.split(",")
    return version === "v1" && value !== undefined && safeEqual(value, expected)
  })
}
