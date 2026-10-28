import { fileURLToPath } from "node:url"
import { createMDX } from "fumadocs-mdx/next"

const withMDX = createMDX()

export default withMDX({
  output: "standalone",
  reactStrictMode: true,
  // monorepo root, so the standalone trace includes hoisted deps
  // `<page>.md` and `<page>.mdx` are served by app/llms.mdx; Accept negotiation lives in proxy.ts
  async rewrites() {
    return [
      { source: "/docs/:path*.md", destination: "/llms.mdx/:path*" },
      { source: "/docs/:path*.mdx", destination: "/llms.mdx/:path*" },
    ]
  },
  outputFileTracingRoot: fileURLToPath(new URL("..", import.meta.url)),
})
