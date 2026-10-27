import { createAnthropic } from "@ai-sdk/anthropic"
import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { createProviderRegistry, type LanguageModel } from "ai"

export interface AiKeys {
  GROQ_API_KEY?: string
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
}

/** Only providers with a key are registered, so an id for any other one resolves to null instead of crashing. */
export function resolveModel(id: string, keys: AiKeys): LanguageModel | null {
  const [provider, ...rest] = id.split(":")
  if (!provider || rest.length === 0) throw new Error(`AI_MODEL must look like "provider:model", got "${id}"`)
  if (!["groq", "openai", "anthropic"].includes(provider))
    throw new Error(`Unknown AI provider "${provider}" in AI_MODEL`)

  const providers: Parameters<typeof createProviderRegistry>[0] = {}
  if (keys.GROQ_API_KEY) providers.groq = createGroq({ apiKey: keys.GROQ_API_KEY })
  if (keys.OPENAI_API_KEY) providers.openai = createOpenAI({ apiKey: keys.OPENAI_API_KEY })
  if (keys.ANTHROPIC_API_KEY) providers.anthropic = createAnthropic({ apiKey: keys.ANTHROPIC_API_KEY })
  if (!providers[provider]) return null
  return createProviderRegistry(providers).languageModel(id as `${string}:${string}`)
}
