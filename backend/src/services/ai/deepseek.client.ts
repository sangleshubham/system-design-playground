/**
 * DeepSeek chat-completions client — a thin native-`fetch` wrapper (research R2, no SDK).
 * Owns the wire format, the timeout/cancel semantics, and the upstream→typed-error map
 * (research R8). Sampler params are omitted deliberately: they are documented no-ops in
 * thinking mode (research R1). `reasoning_content` is never returned to callers.
 *
 * The `DeepSeekClient` interface is intentionally narrow so tests inject a stub and no
 * test ever touches the live API.
 */
import {
  AiAuthFailedError,
  AiOutOfCreditError,
  AiRateLimitedError,
  AiTimeoutError,
  AiUpstreamError,
} from './errors.js';

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export interface DeepSeekRequest {
  model: string;
  messages: ChatMessage[];
  reasoningEffort: 'high' | 'max';
  /** Caller-supplied cancel signal (e.g. the user pressed Cancel). */
  signal?: AbortSignal;
}

export interface DeepSeekResult {
  content: string;
  /** True when the response carried reasoning that we discarded (never parsed/persisted). */
  reasoningDiscarded: boolean;
  usage: { promptTokens: number; completionTokens: number };
  latencyMs: number;
}

export interface DeepSeekClient {
  complete(req: DeepSeekRequest): Promise<DeepSeekResult>;
}

export interface DeepSeekClientConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}

interface DeepSeekResponseBody {
  choices?: Array<{
    message?: { content?: string; reasoning_content?: string };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
}

export function createDeepSeekClient(config: DeepSeekClientConfig): DeepSeekClient {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  return {
    async complete(req: DeepSeekRequest): Promise<DeepSeekResult> {
      // Two abort sources: our timeout and the caller's optional cancel signal.
      const timeoutSignal = AbortSignal.timeout(config.timeoutMs);
      const signal = req.signal
        ? AbortSignal.any([timeoutSignal, req.signal])
        : timeoutSignal;

      const started = Date.now();
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: req.model,
            messages: req.messages,
            thinking: { type: 'enabled' },
            reasoning_effort: req.reasoningEffort,
            stream: false,
          }),
          signal,
        });
      } catch (err) {
        // Timeout or caller cancel both surface as a timeout to the caller (contract R8).
        if (isAbortError(err)) throw new AiTimeoutError();
        throw new AiUpstreamError();
      }

      const latencyMs = Date.now() - started;

      if (!res.ok) {
        if (res.status === 401) throw new AiAuthFailedError();
        if (res.status === 402) throw new AiOutOfCreditError();
        if (res.status === 429) throw new AiRateLimitedError();
        throw new AiUpstreamError();
      }

      let body: DeepSeekResponseBody;
      try {
        body = (await res.json()) as DeepSeekResponseBody;
      } catch {
        throw new AiUpstreamError();
      }

      const message = body.choices?.[0]?.message;
      return {
        content: message?.content ?? '',
        reasoningDiscarded: Boolean(message?.reasoning_content),
        usage: {
          promptTokens: body.usage?.prompt_tokens ?? 0,
          completionTokens: body.usage?.completion_tokens ?? 0,
        },
        latencyMs,
      };
    },
  };
}
