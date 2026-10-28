/**
 * Headers every api response carries. There is no CORS on purpose: browsers reach the api through the
 * apps' same-origin proxies, and server-side or REST clients do not need it. Add an allow list here if
 * you open `/v1` to other origins.
 */
export function withSecurityHeaders(response: Response, opts: { https: boolean }): Response {
  // Redirects and fetched responses can have immutable headers, so copy them.
  const headers = new Headers(response.headers)
  headers.set("x-content-type-options", "nosniff")
  headers.set("referrer-policy", "no-referrer")
  headers.set("content-security-policy", "frame-ancestors 'none'")
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()")
  if (opts.https) headers.set("strict-transport-security", "max-age=63072000; includeSubDomains")
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
