import type { ApiEnv } from "@acme/env/api"
import { LangfuseSpanProcessor } from "@langfuse/otel"
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk"
import { NodeSDK } from "@opentelemetry/sdk-node"
import { registerTelemetry } from "ai"

/** Sends AI SDK calls to Langfuse. Does nothing until both keys are set. */
export function startLangfuse(env: ApiEnv) {
  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) return
  new NodeSDK({
    spanProcessors: [
      new LangfuseSpanProcessor({
        publicKey: env.LANGFUSE_PUBLIC_KEY,
        secretKey: env.LANGFUSE_SECRET_KEY,
        baseUrl: env.LANGFUSE_BASE_URL,
      }),
    ],
  }).start()
  registerTelemetry(new LangfuseVercelAiSdkIntegration())
}
