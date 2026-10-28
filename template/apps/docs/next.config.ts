import { fileURLToPath } from "node:url"
import { loadEnvConfig } from "@next/env"
import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next"

const root = fileURLToPath(new URL("../../", import.meta.url))
loadEnvConfig(root)

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: root,
  transpilePackages: ["@acme/ui"],
  poweredByHeader: false,
  reactStrictMode: true,
  // `<page>.md` and `<page>.mdx` are served by app/llms.mdx, Accept negotiation lives in proxy.ts
  async rewrites() {
    return [
      { source: "/docs/:path*.md", destination: "/llms.mdx/:path*" },
      { source: "/docs/:path*.mdx", destination: "/llms.mdx/:path*" },
    ]
  },
}

export default createMDX()(nextConfig)
