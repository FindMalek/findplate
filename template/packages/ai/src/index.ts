import { createAnthropic } from "@ai-sdk/anthropic"
import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"

export interface AiKeys {
  GROQ_API_KEY?: string
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
}

/**
 * Resolves a "provider:model" id (e.g. `groq:openai/gpt-oss-120b`, `anthropic:claude-sonnet-5-5`) to an AI SDK model,
 * or null when that provider has no key, so features can degrade instead of crashing.
 */
export function resolveModel(id: string, keys: AiKeys): LanguageModel | null {
  const [provider, ...rest] = id.split(":")
  const model = rest.join(":")
  if (!model) throw new Error(`AI_MODEL must look like "provider:model", got "${id}"`)
  switch (provider) {
    case "groq":
      return keys.GROQ_API_KEY ? createGroq({ apiKey: keys.GROQ_API_KEY })(model) : null
    case "openai":
      return keys.OPENAI_API_KEY ? createOpenAI({ apiKey: keys.OPENAI_API_KEY })(model) : null
    case "anthropic":
      return keys.ANTHROPIC_API_KEY ? createAnthropic({ apiKey: keys.ANTHROPIC_API_KEY })(model) : null
    default:
      throw new Error(`Unknown AI provider "${provider}" in AI_MODEL`)
  }
}
