import type { AiProviderId, AiProviderMeta, AiSettings, LegacyAiSettings } from './types'

/**
 * Genspark server-side LLM proxy endpoints. All three protocols share the
 * api_key from the gsk login; model ids follow the proxy's own naming scheme,
 * which differs from the official vendor ids.
 */
export const GENSPARK_LLM_BASE_URLS = {
  anthropic: 'https://www.genspark.ai/api/anthropic',
  gemini: 'https://www.genspark.ai/api/llm_proxy/gemini/v1beta',
  openai: 'https://www.genspark.ai/api/llm_proxy/v1',
} as const

/**
 * Splits GenOffice usage out of the proxy's default "Claw" billing bucket
 * (the backend attributes gsk-key traffic by X-Agent-Type). Only sent to the
 * Genspark proxy — never to direct vendor APIs.
 */
export const GENSPARK_AGENT_TYPE = 'genoffice'

export function gensparkAttributionHeaders(baseUrl?: string): Record<string, string> {
  return baseUrl?.startsWith('https://www.genspark.ai')
    ? { 'X-Agent-Type': GENSPARK_AGENT_TYPE }
    : {}
}

export const AI_PROVIDERS: AiProviderMeta[] = [
  {
    id: 'genspark',
    label: 'Genspark',
    models: [
      'claude-opus-4-7',
      'claude-opus-4-8',
      'claude-sonnet-4-6',
      'claude-haiku-4-5',
      'gpt-5.2',
      'gemini-3.1-pro-preview',
      'gemini-3-flash-preview',
    ],
    defaultModel: 'claude-opus-4-7',
    keyPlaceholder: 'Not required - sign in to Genspark',
  },
  {
    id: 'anthropic',
    label: 'Claude',
    models: [
      'claude-sonnet-5',
      'claude-opus-4-8',
      'claude-opus-4-7',
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-opus-4-5-20251101',
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-5-20250929',
    ],
    defaultModel: 'claude-opus-4-7',
    keyPlaceholder: 'sk-ant-api03-...',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    defaultModel: 'gemini-2.5-flash',
    keyPlaceholder: 'AIza...',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini'],
    defaultModel: 'gpt-4.1-mini',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'ollama',
    label: 'Ollama (Local)',
    models: ['llama3', 'llama3.1', 'qwen2.5', 'mistral', 'phi3', 'gemma2'],
    defaultModel: 'llama3',
    keyPlaceholder: 'ollama (not required)',
    needsBaseUrl: true,
  },
  {
    id: 'groq',
    label: 'Groq',
    models: [
      'llama3-70b-8192',
      'llama3-8b-8192',
      'mixtral-8x7b-32768',
      'qwen-2.5-32b',
      'gemma2-9b-it',
    ],
    defaultModel: 'llama3-70b-8192',
    keyPlaceholder: 'gsk_...',
    needsBaseUrl: true,
  },
  {
    id: 'custom',
    label: 'Custom',
    models: [],
    defaultModel: '',
    keyPlaceholder: 'API Key',
    needsBaseUrl: true,
  },
]

/**
 * Fresh settings with every provider's default model and an empty key,
 * except providers listed in `defaultApiKeys` (e.g. an app-specific
 * preconfigured Anthropic key). Callers own that policy; this package
 * has no hardcoded keys.
 */
export function defaultAiSettings(
  defaultApiKeys?: Partial<Record<AiProviderId, string>>,
): AiSettings {
  const providers = {} as AiSettings['providers']
  for (const meta of AI_PROVIDERS) {
    let defaultBaseUrl = ''
    if (meta.id === 'ollama') defaultBaseUrl = 'http://localhost:11434/v1'
    if (meta.id === 'groq') defaultBaseUrl = 'https://api.groq.com/openai/v1'

    providers[meta.id] = {
      apiKey: defaultApiKeys?.[meta.id] ?? (meta.id === 'ollama' ? 'ollama' : ''),
      model: meta.defaultModel,
      baseUrl: meta.needsBaseUrl ? (defaultBaseUrl || '') : undefined,
    }
  }
  return { provider: 'custom', providers }
}

/**
 * Merge on-disk settings over freshly computed defaults, migrating the
 * pre-provider shape (a single OpenAI-compatible endpoint) into the
 * "custom" provider slot. `stored` is whatever the caller read from its
 * settings file (already JSON-parsed); this function does no file I/O.
 */
export function resolveAiSettings(
  stored: Partial<AiSettings> & LegacyAiSettings,
  defaults: AiSettings,
): AiSettings {
  if (!stored.providers) {
    if (stored.apiKey) {
      defaults.providers.custom = {
        apiKey: stored.apiKey,
        model: stored.model ?? '',
        baseUrl: stored.baseUrl ?? 'https://api.openai.com/v1',
      }
    }
    return defaults
  }
  return {
    provider: stored.provider ?? defaults.provider,
    providers: { ...defaults.providers, ...stored.providers },
  }
}

/**
 * Fetch the list of available model IDs from an OpenAI-compatible `/v1/models`
 * endpoint. Works with OpenAI, Groq, Ollama, LM Studio, and any other server
 * that implements the standard models listing.
 *
 * @returns sorted array of model id strings, or throws on network / auth error.
 */
export async function fetchAvailableModels(
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const url = `${baseUrl.replace(/\/$/, '')}/models`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  // Ollama doesn't need auth, but others do
  if (apiKey && apiKey !== 'ollama') {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  const response = await fetch(url, { method: 'GET', headers, signal })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to fetch models (HTTP ${response.status}): ${body.slice(0, 200)}`)
  }
  const json = (await response.json()) as { data?: Array<{ id: string }> }
  const models = json.data?.map((m) => m.id).filter(Boolean) ?? []
  models.sort((a, b) => a.localeCompare(b))
  return models
}
