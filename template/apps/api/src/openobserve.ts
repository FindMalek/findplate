import type { ApiEnv } from "@acme/env/api"
import { SpanStatusCode, trace } from "@opentelemetry/api"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { NodeSDK } from "@opentelemetry/sdk-node"

/** Sends api traces to OpenObserve's otlp endpoint. Does nothing until `OPENOBSERVE_URL` is set. */
export function startOpenObserve(env: ApiEnv) {
  if (!env.OPENOBSERVE_URL || !env.OPENOBSERVE_USER || !env.OPENOBSERVE_PASSWORD) return
  const token = Buffer.from(`${env.OPENOBSERVE_USER}:${env.OPENOBSERVE_PASSWORD}`).toString("base64")
  new NodeSDK({
    serviceName: "api",
    traceExporter: new OTLPTraceExporter({
      url: `${env.OPENOBSERVE_URL}/api/${env.OPENOBSERVE_ORG}/v1/traces`,
      headers: { Authorization: `Basic ${token}` },
    }),
  }).start()
}

/** oRPC interceptor: one span per request. */
export async function traceCall<T>({
  next,
  request,
}: {
  next: () => Promise<T>
  request: { method: string; url: URL }
}): Promise<T> {
  return trace.getTracer("api").startActiveSpan(`${request.method} ${request.url.pathname}`, async (span) => {
    try {
      return await next()
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw error
    } finally {
      span.end()
    }
  })
}
