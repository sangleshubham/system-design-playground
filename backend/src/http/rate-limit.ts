/**
 * Fixed-window in-memory rate limiter (research R7). One instance per bucket
 * (`validateFail`: 10/min, `create`: 5/min in production wiring). Single-node only —
 * state resets on process restart by design. The clock is injectable for tests.
 */

export interface RateLimiterOptions {
  /** Events allowed per window. */
  limit: number;
  /** Window length in ms (default 60 000). */
  windowMs?: number;
  /** Clock override for tests (default Date.now). */
  now?: () => number;
}

interface Bucket {
  count: number;
  windowStart: number;
}

/** Lazy global prune kicks in when the map grows past this many keys. */
const PRUNE_THRESHOLD = 1000;

export class FixedWindowRateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly buckets = new Map<string, Bucket>();

  constructor(options: RateLimiterOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs ?? 60_000;
    this.now = options.now ?? Date.now;
  }

  /** True when `key` has exhausted its budget in the current window. */
  isLimited(key: string): boolean {
    const bucket = this.liveBucket(key);
    return bucket !== undefined && bucket.count >= this.limit;
  }

  /** Count one event against `key`. */
  record(key: string): void {
    const at = this.now();
    const bucket = this.liveBucket(key);
    if (bucket) {
      bucket.count += 1;
    } else {
      if (this.buckets.size >= PRUNE_THRESHOLD) this.prune(at);
      this.buckets.set(key, { count: 1, windowStart: at });
    }
  }

  /** Return the bucket for `key` if its window is still open; expire it otherwise. */
  private liveBucket(key: string): Bucket | undefined {
    const bucket = this.buckets.get(key);
    if (!bucket) return undefined;
    if (this.now() - bucket.windowStart >= this.windowMs) {
      this.buckets.delete(key);
      return undefined;
    }
    return bucket;
  }

  private prune(at: number): void {
    for (const [key, bucket] of this.buckets) {
      if (at - bucket.windowStart >= this.windowMs) this.buckets.delete(key);
    }
  }
}
