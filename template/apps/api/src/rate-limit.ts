import { clientIp, RATE_LIMITS, type Services } from "@acme/orpc"

/** Sign-in and sign-up posts are the brute-force target, so they get the tight `auth` rule per ip. */
export async function limitAuth(services: Pick<Services, "rateLimiter">, request: Request): Promise<Response | null> {
  if (request.method !== "POST") return null
  const hit = await services.rateLimiter.hit(`auth:${clientIp(request.headers)}`, RATE_LIMITS.auth)
  if (hit.ok) return null
  const retryAfter = String(Math.ceil(hit.retryAfterMs / 1000))
  return Response.json({ message: "Too many requests." }, { status: 429, headers: { "retry-after": retryAfter } })
}
