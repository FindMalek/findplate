import { fileURLToPath } from "node:url"
import { loadEnvConfig } from "@next/env"
import type { NextConfig } from "next"

const root = fileURLToPath(new URL("../../", import.meta.url))
// One .env at the repo root for every app.
loadEnvConfig(root)

/** Baseline security headers; tighten the CSP per project once its third parties are known. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
]

const transpilePackages = ["@acme/ui", "@acme/orpc", "@acme/common"]
transpilePackages.push("@acme/logger") // @findplate:logger

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: root,
  transpilePackages,
  poweredByHeader: false,
  typedRoutes: true,
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
}

export default nextConfig
