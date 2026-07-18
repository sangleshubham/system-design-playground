/**
 * AI review orchestration (research R3/R4). Loads the saved design, builds the prompt,
 * calls the injected DeepSeek client, parses + validates the JSON output with exactly one
 * repair retry, and guards against concurrent per-level requests. The client is always
 * injected so no test hits the live API.
 *
 * Persistence + the design-hash cache (US2/T017): a successful review is upserted keyed by
 * `(levelId, designHash, model)`; an unchanged design (same key, no `force`) is served from
 * that row with `cached: true` and zero upstream spend (FR-006/FR-007). Failed calls persist
 * nothing (FR-010). `getStored` powers the GET endpoint — restore after reload, never
 * calling upstream.
 */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AiConfig } from '../../config/ai.config.js';
import type { Component, Level } from '../../models/index.js';
import {
  AiReviewPayloadSchema,
  type AiReview,
  type AiReviewGetResponse,
  type AiReviewPayload,
} from '../../models/ai-review.js';
import type { DesignRepo } from '../../db/design.repo.js';
import type { AiReviewRepo } from '../../db/ai-review.repo.js';
import type { DeepSeekClient, ChatMessage } from './deepseek.client.js';
import { buildReviewPrompt } from './review-prompt.js';
import { designHash } from './design-hash.js';
import {
  AiMalformedOutputError,
  AiNotConfiguredError,
  AiReviewInFlightError,
  DesignEmptyError,
} from './errors.js';

export interface ReviewOptions {
  /** Use the deep-review model (config.deepModel). */
  deep?: boolean;
  /** Bypass the design-hash cache and re-call the model, replacing the stored row. */
  force?: boolean;
  /** Caller cancel signal, passed through to the upstream client. */
  signal?: AbortSignal;
}

export interface ReviewResult {
  review: AiReview;
  cached: boolean;
}

export interface AiReviewService {
  review(level: Level, opts?: ReviewOptions): Promise<ReviewResult>;
  /** Latest stored review for the level's CURRENT saved design (GET endpoint; no upstream). */
  getStored(level: Level): AiReviewGetResponse;
}

export interface AiReviewServiceDeps {
  config: AiConfig;
  client: DeepSeekClient;
  designs: DesignRepo;
  reviews: AiReviewRepo;
  componentsById: Map<string, Component>;
}

/** Strip a leading/trailing markdown code fence if the model wrapped its JSON in one. */
function stripCodeFences(raw: string): string {
  const s = raw.trim();
  if (!s.startsWith('```')) return s;
  return s
    .replace(/^```[a-zA-Z]*\s*\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

type ParseOutcome =
  | { ok: true; payload: AiReviewPayload }
  | { ok: false; error: string };

function parsePayload(content: string): ParseOutcome {
  let json: unknown;
  try {
    json = JSON.parse(stripCodeFences(content));
  } catch (e) {
    return { ok: false, error: `not valid JSON (${(e as Error).message})` };
  }
  const result = AiReviewPayloadSchema.safeParse(json);
  if (!result.success) return { ok: false, error: formatZodError(result.error) };
  return { ok: true, payload: result.data };
}

export function createAiReviewService(deps: AiReviewServiceDeps): AiReviewService {
  const { config, client, designs, reviews, componentsById } = deps;
  // Per-level in-flight guard (R4): at most one upstream call per level at a time.
  const inFlight = new Set<string>();

  return {
    async review(level: Level, opts: ReviewOptions = {}): Promise<ReviewResult> {
      // Not-configured short-circuits before any hash/prompt work (FR-009; hardened in T021).
      if (!config.enabled) throw new AiNotConfiguredError();

      if (inFlight.has(level.id)) throw new AiReviewInFlightError();
      inFlight.add(level.id);
      try {
        const design = designs.getByLevelId(level.id);
        const nodes = design?.nodes ?? [];
        const edges = design?.edges ?? [];
        if (nodes.length === 0) throw new DesignEmptyError();

        const model = opts.deep ? config.deepModel : config.model;
        const hash = designHash(nodes, edges);

        // Cache (FR-007): an unchanged design reviewed by the same model is served from the
        // stored row — instant, zero upstream spend. `force` bypasses this to re-generate.
        if (!opts.force) {
          const hit = reviews.findByKey(level.id, hash, model);
          if (hit) return { review: hit, cached: true };
        }

        // buildReviewPrompt throws DesignTooLargeError above the 200-node cap.
        const messages = buildReviewPrompt({ level, nodes, edges, componentsById });

        console.log("Messages: " + JSON.stringify(messages, null, 2))

        // First attempt.
        let result = await client.complete({
          model,
          messages,
          reasoningEffort: config.reasoningEffort,
          signal: opts.signal,
        });
        let parsed = parsePayload(result.content);

        // Exactly one repair retry echoing the error and demanding conformant JSON (FR-011).
        if (!parsed.ok) {
          const repairMessages: ChatMessage[] = [
            ...messages,
            {
              role: 'user',
              content: `Your previous response was ${parsed.error}. Respond again with a SINGLE valid JSON object that matches the required schema exactly — no markdown, no code fences, no text before or after.`,
            },
          ];
          result = await client.complete({
            model,
            messages: repairMessages,
            reasoningEffort: config.reasoningEffort,
            signal: opts.signal,
          });
          parsed = parsePayload(result.content);
          if (!parsed.ok) throw new AiMalformedOutputError();
        }

        const review: AiReview = {
          id: randomUUID(),
          levelId: level.id,
          designHash: hash,
          model,
          reasoningEffort: config.reasoningEffort,
          payload: parsed.payload,
          usage: {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            latencyMs: result.latencyMs,
          },
          createdAt: new Date().toISOString(),
        };

        console.log("Review: " + JSON.stringify(review))

        // Persist only after a successful, validated call (FR-010); a forced re-run overwrites
        // the row for this exact key (FR-006). Flash and pro reviews use different keys, so
        // they coexist as separate rows (R5).
        reviews.upsertReview(review);

        return { review, cached: false };
      } finally {
        inFlight.delete(level.id);
      }
    },

    getStored(level: Level): AiReviewGetResponse {
      const models = { default: config.model, deep: config.deepModel };
      const design = designs.getByLevelId(level.id);
      const nodes = design?.nodes ?? [];
      const edges = design?.edges ?? [];

      // Newest row matching the CURRENT design's hash across both models (default + deep
      // coexist; newest wins). No current review ⇒ stale when older reviews exist for other
      // hashes, i.e. the design changed since it was last reviewed (contracts/api.md § GET).
      const review = nodes.length > 0 ? reviews.findLatestForHash(level.id, designHash(nodes, edges)) : null;
      const stale = review === null && reviews.hasAnyForLevel(level.id);

      return { available: true, models, review, stale };
    },
  };
}
