/**
 * Client-side key formatting — a UX mirror of backend/src/auth/key.ts. Used by the welcome
 * gate (live normalization + grouping) and the session affordance (masking). The server is
 * still the source of truth: it re-normalizes every presented key.
 */

/** Uppercase, keep only Crockford characters, cap at the 12-char key length (display helper). */
export function stripToKeyChars(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, 12);
}

/** Full canonical form (what we store and send): aliases applied, hyphens/spaces gone. */
export function canonicalKey(input: string): string {
  return stripToKeyChars(input).replace(/O/g, '0').replace(/[IL]/g, '1');
}

/** Group a (partial) key as XXXX-XXXX-XXXX for display. */
export function groupKey(input: string): string {
  const chars = stripToKeyChars(input);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].filter(Boolean).join('-');
}

/** A masked stub — the last 4 characters only, never the full key (FR-005, ui-auth-surfaces). */
export function maskKey(key: string): string {
  const chars = canonicalKey(key);
  return chars.length <= 4 ? chars : `••••-${chars.slice(-4)}`;
}
