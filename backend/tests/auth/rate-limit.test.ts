import { describe, expect, it } from 'vitest';
import { FixedWindowRateLimiter } from '../../src/http/rate-limit.js';

function makeLimiter(limit: number) {
  let t = 0;
  const limiter = new FixedWindowRateLimiter({ limit, windowMs: 60_000, now: () => t });
  return { limiter, tick: (ms: number) => (t += ms) };
}

describe('FixedWindowRateLimiter', () => {
  it('allows exactly `limit` events, then limits (11th failure blocks at limit 10)', () => {
    const { limiter } = makeLimiter(10);
    for (let i = 0; i < 10; i++) {
      expect(limiter.isLimited('ip1')).toBe(false);
      limiter.record('ip1');
    }
    expect(limiter.isLimited('ip1')).toBe(true);
  });

  it('resets when the window rolls over', () => {
    const { limiter, tick } = makeLimiter(5);
    for (let i = 0; i < 5; i++) limiter.record('ip1');
    expect(limiter.isLimited('ip1')).toBe(true);
    tick(60_000);
    expect(limiter.isLimited('ip1')).toBe(false);
    limiter.record('ip1');
    expect(limiter.isLimited('ip1')).toBe(false);
  });

  it('does not count events that are never recorded (successes are free)', () => {
    const { limiter } = makeLimiter(2);
    for (let i = 0; i < 50; i++) expect(limiter.isLimited('ip1')).toBe(false);
    limiter.record('ip1');
    expect(limiter.isLimited('ip1')).toBe(false);
  });

  it('tracks keys independently', () => {
    const { limiter } = makeLimiter(1);
    limiter.record('ip1');
    expect(limiter.isLimited('ip1')).toBe(true);
    expect(limiter.isLimited('ip2')).toBe(false);
  });

  it('separate instances (buckets) are independent', () => {
    const { limiter: creates } = makeLimiter(5);
    const { limiter: failures } = makeLimiter(10);
    for (let i = 0; i < 5; i++) creates.record('ip1');
    expect(creates.isLimited('ip1')).toBe(true);
    expect(failures.isLimited('ip1')).toBe(false);
  });

  it('keeps counting inside an open window even after limiting starts', () => {
    const { limiter, tick } = makeLimiter(3);
    for (let i = 0; i < 3; i++) limiter.record('ip1');
    tick(30_000);
    expect(limiter.isLimited('ip1')).toBe(true); // mid-window: still limited
    tick(30_000);
    expect(limiter.isLimited('ip1')).toBe(false); // window elapsed from first event
  });
});
