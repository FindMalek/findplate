import { fileURLToPath } from "node:url"
import { createMDX } from "fumadocs-mdx/next"

const withMDX = createMDX()

export default withMDX({
  output: "standalone",
  reactStrictMode: true,
  // monorepo root, so the standalone trace includes hoisted deps
  outputFileTracingRoot: fileURLToPath(new URL("..", import.meta.url)),
})
