/**
 * Typed AI config read once from env. Absence of `DEEPSEEK_API_KEY` disables the
 * feature (`enabled: false`) rather than throwing — the playground must stay fully
 * usable without it (FR-009). The key itself is never re-exported in serialized form.
 */
export interface AiConfig {
  enabled: boolean;
  apiKey: string | undefined;
  model: string;
  deepModel: string;
  baseUrl: string;
  reasoningEffort: 'high' | 'max';
  timeoutMs: number;
}

function readReasoningEffort(raw: string | undefined): 'high' | 'max' {
  return raw === 'max' ? 'max' : 'high';
}

export function loadAiConfig(): AiConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY || undefined;
  return {
    enabled: Boolean(apiKey),
    apiKey,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    deepModel: process.env.DEEPSEEK_DEEP_MODEL || 'deepseek-v4-pro',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    reasoningEffort: readReasoningEffort(process.env.DEEPSEEK_REASONING_EFFORT),
    timeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS) || 120000,
  };
}
