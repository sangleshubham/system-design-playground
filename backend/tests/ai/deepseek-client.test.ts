import { describe, it, expect, vi, afterEach } from 'vitest';
import { createDeepSeekClient, type ChatMessage } from '../../src/services/ai/deepseek.client.js';
import {
  AiAuthFailedError,
  AiOutOfCreditError,
  AiRateLimitedError,
  AiTimeoutError,
  AiUpstreamError,
} from '../../src/services/ai/errors.js';

const CONFIG = { apiKey: 'test-key', baseUrl: 'https://api.deepseek.test', timeoutMs: 50 };

const MESSAGES: ChatMessage[] = [
  { role: 'system', content: 'rubric' },
  { role: 'user', content: 'design' },
];

function baseReq() {
  return { model: 'deepseek-v4-flash', messages: MESSAGES, reasoningEffort: 'high' as const };
}

function stubFetch(impl: (...args: unknown[]) => unknown) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** A fetch that never resolves on its own but rejects with the abort reason when aborted. */
function hangingFetch() {
  return (_url: unknown, init: { signal?: AbortSignal }) =>
    new Promise((_resolve, reject) => {
      const signal = init.signal;
      if (!signal) return;
      if (signal.aborted) return reject(signal.reason);
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deepseek.client', () => {
  it('maps content, reasoning-discard flag, and usage on success', async () => {
    const fetchMock = stubFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '{"score":80}', reasoning_content: 'long thoughts' } }],
        usage: { prompt_tokens: 1200, completion_tokens: 3400 },
      }),
    }));

    const res = await createDeepSeekClient(CONFIG).complete(baseReq());

    expect(res.content).toBe('{"score":80}');
    expect(res.reasoningDiscarded).toBe(true);
    expect(res.usage).toEqual({ promptTokens: 1200, completionTokens: 3400 });
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);

    // Request shape: thinking enabled, reasoning_effort, stream false, bearer auth, NO samplers (R1).
    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe('https://api.deepseek.test/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('deepseek-v4-flash');
    expect(body.thinking).toEqual({ type: 'enabled' });
    expect(body.reasoning_effort).toBe('high');
    expect(body.stream).toBe(false);
    expect(body.temperature).toBeUndefined();
    expect(body.top_p).toBeUndefined();
    expect(body.presence_penalty).toBeUndefined();
    expect(body.frequency_penalty).toBeUndefined();
  });

  it('defaults missing usage/content to safe values', async () => {
    stubFetch(async () => ({ ok: true, status: 200, json: async () => ({ choices: [] }) }));
    const res = await createDeepSeekClient(CONFIG).complete(baseReq());
    expect(res.content).toBe('');
    expect(res.reasoningDiscarded).toBe(false);
    expect(res.usage).toEqual({ promptTokens: 0, completionTokens: 0 });
  });

  const statusCases: Array<[number, new (...a: never[]) => Error]> = [
    [401, AiAuthFailedError],
    [402, AiOutOfCreditError],
    [429, AiRateLimitedError],
    [500, AiUpstreamError],
    [503, AiUpstreamError],
  ];
  for (const [status, ErrCls] of statusCases) {
    it(`maps upstream ${status} to ${ErrCls.name}`, async () => {
      stubFetch(async () => ({ ok: false, status, json: async () => ({}) }));
      await expect(createDeepSeekClient(CONFIG).complete(baseReq())).rejects.toBeInstanceOf(ErrCls);
    });
  }

  it('maps a network failure to AiUpstreamError', async () => {
    stubFetch(async () => {
      throw new TypeError('network down');
    });
    await expect(createDeepSeekClient(CONFIG).complete(baseReq())).rejects.toBeInstanceOf(
      AiUpstreamError,
    );
  });

  it('maps a timeout to AiTimeoutError', async () => {
    stubFetch(hangingFetch());
    const client = createDeepSeekClient({ ...CONFIG, timeoutMs: 10 });
    await expect(client.complete(baseReq())).rejects.toBeInstanceOf(AiTimeoutError);
  });

  it('maps an external cancel to AiTimeoutError', async () => {
    stubFetch(hangingFetch());
    const controller = new AbortController();
    const client = createDeepSeekClient({ ...CONFIG, timeoutMs: 60000 });
    const promise = client.complete({ ...baseReq(), signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(AiTimeoutError);
  });
});
