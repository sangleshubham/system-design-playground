/**
 * Access-key primitives (research R1/R2). Keys are 12 Crockford Base32 characters
 * (I, L, O, U excluded) generated from a CSPRNG — 60 bits of entropy. The server only
 * ever persists `hashKey(normalized)`; the raw key exists transiently in the create
 * response. Display form groups as XXXX-XXXX-XXXX (14 chars, the SC-003 ceiling).
 */
import { createHash, randomBytes } from 'node:crypto';

/** Crockford Base32 alphabet: 32 symbols, no I/L/O/U. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const KEY_LENGTH = 12;

const SHAPE = /^[0-9A-HJKMNP-TV-Z]{12}$/;

/** Generate a new raw key (normalized form, no hyphens). */
export function generateKey(): string {
  // 32 divides 256 evenly, so `byte & 31` is uniform — no rejection sampling needed.
  const bytes = randomBytes(KEY_LENGTH);
  let key = '';
  for (const byte of bytes) {
    key += ALPHABET[byte & 31];
  }
  return key;
}

/** Display/share form: XXXX-XXXX-XXXX. Input must already be normalized. */
export function formatKey(normalized: string): string {
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}`;
}

/**
 * Fold user input to canonical form: uppercase, hyphens/whitespace stripped, and
 * Crockford's decode aliases applied (O→0, I→1, L→1) so keys survive being read
 * aloud or hand-typed. U has no alias — it is simply never part of a valid key.
 */
export function normalizeKey(input: string): string {
  return input
    .toUpperCase()
    .replace(/[-\s]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

/** True when a normalized candidate has the exact shape of an issued key. */
export function isValidShape(normalized: string): boolean {
  return SHAPE.test(normalized);
}

/** Hex SHA-256 of the normalized key — the only form the database ever sees. */
export function hashKey(normalized: string): string {
  return createHash('sha256').update(normalized).digest('hex');
}
