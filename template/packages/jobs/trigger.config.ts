import { defineConfig } from "@trigger.dev/sdk"

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_replace_me",
  dirs: ["./src/trigger"],
  runtime: "node",
  maxDuration: 300,
  // Self-hosted: point the cli at your instance with TRIGGER_API_URL, nothing changes here.
})
