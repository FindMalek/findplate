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
}

export default createMDX()(nextConfig)
