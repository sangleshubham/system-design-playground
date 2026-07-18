/**
 * Canvas keyboard router (research.md R1/R2/R10; contract keyboard-shortcuts.md).
 *
 * A single, DI-free dispatch point for every canvas keyboard shortcut. The host
 * (`CanvasComponent`) builds a binding table wired to store/flow calls, constructs a
 * router with it, and feeds the router every `document:keydown`. The router applies the
 * two global guards in order — G1 text-editing, then G2 lock — resolves the platform
 * primary modifier (Cmd on macOS, Ctrl elsewhere), and runs the first binding whose
 * combo matches. Keeping this module free of Angular means the guard ordering, platform
 * matching, and preventDefault rules are unit-testable without component scaffolding.
 *
 * Per-binding guards beyond the two globals (e.g. G3 zoom-target scope) live in a
 * binding's own `isApplicable` / `preventDefaultWhen` predicates, not here.
 */

/** Platform-resolved primary modifier target: Cmd on macOS, Ctrl elsewhere (FR-024). */
export type Platform = 'mac' | 'other';

/**
 * A key-combination matcher. `keys` are compared against the normalized event key
 * (see {@link normalizeKey}); `mod` requires the platform primary modifier.
 */
export interface KeyCombo {
  /** Normalized keys this combo fires on, e.g. `['c']`, `['z']`, `['delete', 'backspace']`. */
  keys: readonly string[];
  /** Require the platform primary modifier (Cmd/Ctrl). Default: not required. */
  mod?: boolean;
  /** Shift: `true` = must be held, `false` = must NOT be held, `undefined` = don't care. */
  shift?: boolean;
  /**
   * Match on the key alone, ignoring all modifier state. Used only for the legacy
   * Delete/Backspace binding, which historically fired regardless of modifiers.
   */
  anyModifiers?: boolean;
}

/**
 * The subset of `KeyboardEvent` the router reads. A real `KeyboardEvent` satisfies this
 * structurally, and tests can pass plain objects — no DOM needed.
 */
export interface ShortcutEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
  preventDefault(): void;
}

export interface ShortcutBinding {
  /** Stable identifier, for debugging and tests. */
  id: string;
  combo: KeyCombo;
  /** Runs when this binding is dispatched (combo matched and applicable). */
  action: (event: ShortcutEvent) => void;
  /**
   * Whether the binding may fire for this event/state. Default: always applicable.
   * The same predicate backs disabled states of the mirrored toolbar/menu controls.
   */
  isApplicable?: (event: ShortcutEvent) => boolean;
  /** Whether to `preventDefault()` when dispatched. Default: yes. */
  preventDefaultWhen?: (event: ShortcutEvent) => boolean;
}

export interface ShortcutEnv {
  platform: Platform;
  /** Lock predicate (G2): when true, every binding is inert. */
  locked: () => boolean;
}

export interface ShortcutRouter {
  handleKeydown(event: ShortcutEvent): void;
  /** The live binding table, exposed for host wiring and tests. */
  readonly bindings: ShortcutBinding[];
}

/**
 * Normalize a `KeyboardEvent.key` for combo matching: lowercase, with `+`/`=` treated as
 * equivalent and `_`/`-` treated as equivalent (so a combo can match a key whether or not
 * Shift produced the shifted glyph — e.g. `Mod++` and `Mod+=` both resolve to `=`).
 * Named keys (`ArrowUp`, `Delete`, `Escape`, …) become their lowercase form.
 */
export function normalizeKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower === '+') return '=';
  if (lower === '_') return '-';
  return lower;
}

/**
 * G1 predicate: is the event targeting an editable field? INPUT/TEXTAREA or any element
 * that is content-editable (which is inherited, so this also covers targets inside a
 * `[contenteditable]` container). Mirrors the pre-existing guard at canvas.component.ts.
 */
export function isTextEditingTarget(target: EventTarget | null): boolean {
  const el = target as (HTMLElement & { isContentEditable?: boolean }) | null;
  if (!el || typeof el.tagName !== 'string') return false;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
  return el.isContentEditable === true;
}

/** Does `combo` match `event` under the given platform? Wrong-modifier events never match. */
export function comboMatches(combo: KeyCombo, event: ShortcutEvent, platform: Platform): boolean {
  if (!combo.keys.includes(normalizeKey(event.key))) return false;
  if (combo.anyModifiers) return true;

  const modPressed = platform === 'mac' ? event.metaKey : event.ctrlKey;
  const wrongMod = platform === 'mac' ? event.ctrlKey : event.metaKey;
  // The wrong primary modifier for this platform disqualifies the combo outright.
  if (wrongMod) return false;
  if (combo.mod ? !modPressed : modPressed) return false;

  if (combo.shift === true && !event.shiftKey) return false;
  if (combo.shift === false && event.shiftKey) return false;
  // No binding uses Alt; an Alt-held keystroke should never hijack a canvas shortcut.
  if (event.altKey) return false;
  return true;
}

/**
 * Build a router over `bindings` and `env`. The bindings array is retained by reference,
 * so a host may push additional bindings after construction (each later user story
 * registers its keys the same way). Predicates read live state at event time.
 */
export function createShortcutRouter(bindings: ShortcutBinding[], env: ShortcutEnv): ShortcutRouter {
  function handleKeydown(event: ShortcutEvent): void {
    // G1 — text editing: ignore entirely (no preventDefault) so native field behavior,
    // including field-level Cmd/Ctrl+C/V/Z and the browser's own text undo, wins.
    if (isTextEditingTarget(event.target)) return;
    // G2 — lock: every binding is inert while the canvas is locked.
    if (env.locked()) return;

    for (const binding of bindings) {
      if (!comboMatches(binding.combo, event, env.platform)) continue;
      // First matching combo claims the keystroke. If it isn't applicable right now it is
      // a silent no-op (no action, no preventDefault) — e.g. an empty-selection arrow key
      // falls through to native page scroll.
      const applicable = binding.isApplicable ? binding.isApplicable(event) : true;
      if (applicable) {
        const preventDefault = binding.preventDefaultWhen ? binding.preventDefaultWhen(event) : true;
        if (preventDefault) event.preventDefault();
        binding.action(event);
      }
      return;
    }
  }

  return { handleKeydown, bindings };
}

/** Detect the current platform from the browser. Impure — kept out of the router core. */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  // Use `||` (not `??`) so an EMPTY userAgentData.platform — which some browsers report in
  // headless / privacy-hardened contexts — falls through to navigator.platform instead of
  // short-circuiting to "" and misdetecting every Mac as a Ctrl (non-mac) platform.
  const platformString = uaData?.platform || navigator.platform || navigator.userAgent || '';
  return /mac|iphone|ipad|ipod/i.test(platformString) ? 'mac' : 'other';
}
