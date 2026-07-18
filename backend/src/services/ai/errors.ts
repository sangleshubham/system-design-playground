/**
 * Typed error taxonomy for the AI review package (research R8, contracts/api.md).
 * Every error carries a stable `code` from the contract error table; the route
 * (T011) maps `code` → HTTP status. Messages are human-readable and MUST never
 * contain the API key or the raw prompt (FR-008).
 */
import type { AiReviewErrorCode } from '../../models/ai-review.js';

export abstract class AiReviewError extends Error {
  abstract readonly code: AiReviewErrorCode;
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Saved design has no nodes — nothing to review (422). */
export class DesignEmptyError extends AiReviewError {
  readonly code = 'design_empty';
  constructor(message = 'Add components to the canvas before requesting an AI review.') {
    super(message);
  }
}

/** Saved design exceeds the 200-node serialization cap (422). */
export class DesignTooLargeError extends AiReviewError {
  readonly code = 'design_too_large';
  constructor(message = 'This design is too large to review (200-node limit). Trim it and retry.') {
    super(message);
  }
}

/** A review for this level is already running (409). */
export class AiReviewInFlightError extends AiReviewError {
  readonly code = 'ai_review_in_flight';
  constructor(message = 'An AI review for this level is already running.') {
    super(message);
  }
}

/** No API key configured on this server (503). */
export class AiNotConfiguredError extends AiReviewError {
  readonly code = 'ai_not_configured';
  constructor(message = 'AI review is not configured on this server.') {
    super(message);
  }
}

/** Upstream 429 — retryable (503). */
export class AiRateLimitedError extends AiReviewError {
  readonly code = 'ai_rate_limited';
  constructor(message = 'The AI service is rate limited. Please try again shortly.') {
    super(message);
  }
}

/** Upstream 401 — operator's API key problem (502). */
export class AiAuthFailedError extends AiReviewError {
  readonly code = 'ai_auth_failed';
  constructor(message = 'The AI service rejected the server credentials.') {
    super(message);
  }
}

/** Upstream 402 — operator is out of credit (502). */
export class AiOutOfCreditError extends AiReviewError {
  readonly code = 'ai_out_of_credit';
  constructor(message = 'The AI service account is out of credit.') {
    super(message);
  }
}

/** Upstream 5xx / network failure — retryable (502). */
export class AiUpstreamError extends AiReviewError {
  readonly code = 'ai_upstream_error';
  constructor(message = 'The AI service is temporarily unavailable. Please try again.') {
    super(message);
  }
}

/** Model returned invalid JSON after one repair retry (502). */
export class AiMalformedOutputError extends AiReviewError {
  readonly code = 'ai_malformed_output';
  constructor(message = 'The AI service returned an unreadable review. Please try again.') {
    super(message);
  }
}

/** Upstream call aborted — timeout or client cancel (504). */
export class AiTimeoutError extends AiReviewError {
  readonly code = 'ai_timeout';
  constructor(message = 'The AI review timed out. Please try again.') {
    super(message);
  }
}
