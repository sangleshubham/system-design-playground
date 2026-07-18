import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  comboMatches,
  createShortcutRouter,
  detectPlatform,
  isTextEditingTarget,
  normalizeKey,
  type Platform,
  type ShortcutBinding,
  type ShortcutEvent,
} from './canvas-shortcuts';

/** Build a synthetic keydown with sane defaults and a fresh preventDefault spy. */
function keyEvent(key: string, overrides: Partial<ShortcutEvent> = {}): ShortcutEvent {
  return {
    key,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    target: null,
    ...overrides,
    preventDefault: vi.fn(),
  };
}

const el = (props: Record<string, unknown>): EventTarget => props as unknown as EventTarget;

describe('detectPlatform', () => {
  afterEach(() => vi.unstubAllGlobals());

  // Regression: some Chrome builds (headless, privacy-hardened) report an EMPTY
  // userAgentData.platform. A `??` chain short-circuits to '' and misdetects a Mac as a
  // non-mac (Ctrl) platform, silently breaking every Cmd+* shortcut. `||` must fall through.
  it('falls back to navigator.platform when userAgentData.platform is an empty string', () => {
    vi.stubGlobal('navigator', { userAgentData: { platform: '' }, platform: 'MacIntel', userAgent: 'x' });
    expect(detectPlatform()).toBe('mac');
  });

  it('uses userAgentData.platform when it is present', () => {
    vi.stubGlobal('navigator', { userAgentData: { platform: 'macOS' }, platform: '', userAgent: 'x' });
    expect(detectPlatform()).toBe('mac');
  });

  it('reports "other" when no signal indicates a Mac', () => {
    vi.stubGlobal('navigator', { userAgentData: { platform: '' }, platform: 'Win32', userAgent: 'Mozilla' });
    expect(detectPlatform()).toBe('other');
  });
});

interface RouterState {
  locked: boolean;
  platform: Platform;
  hasSelection: boolean;
  /** Canvas non-empty — gates select-all. Defaults to true when omitted. */
  hasElements?: boolean;
  /** Canvas is the active zoom target (G3) — gates zoom bindings. Defaults to false. */
  canvasActive?: boolean;
}

/**
 * A representative binding table mirroring the shapes the canvas registers: the Delete
 * parity binding (anyModifiers, selection-gated), Mod bindings (copy, duplicate), a
 * Shift-discriminated pair (undo/redo), select-all (canvas-non-empty gated), an Escape that
 * never preventDefaults, a selection-gated arrow (preventDefault only with selection), and
 * zoom bindings scoped to the active canvas (G3).
 */
function makeRouter(state: RouterState) {
  const actions = {
    delete: vi.fn(),
    copy: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    selectAll: vi.fn(),
    escape: vi.fn(),
    duplicate: vi.fn(),
    nudgeUp: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    zoomReset: vi.fn(),
    noPrevent: vi.fn(),
  };
  const bindings: ShortcutBinding[] = [
    {
      id: 'delete',
      combo: { keys: ['delete', 'backspace'], anyModifiers: true },
      isApplicable: () => state.hasSelection,
      action: actions.delete,
    },
    {
      id: 'copy',
      combo: { keys: ['c'], mod: true },
      isApplicable: () => state.hasSelection,
      action: actions.copy,
    },
    { id: 'undo', combo: { keys: ['z'], mod: true, shift: false }, action: actions.undo },
    { id: 'redo', combo: { keys: ['z'], mod: true, shift: true }, action: actions.redo },
    {
      id: 'select-all',
      combo: { keys: ['a'], mod: true },
      isApplicable: () => state.hasElements !== false,
      action: actions.selectAll,
    },
    {
      id: 'escape-clear',
      combo: { keys: ['escape'] },
      preventDefaultWhen: () => false,
      action: actions.escape,
    },
    {
      id: 'duplicate',
      combo: { keys: ['d'], mod: true },
      isApplicable: () => state.hasSelection,
      action: actions.duplicate,
    },
    {
      id: 'nudge-up',
      combo: { keys: ['arrowup'] },
      isApplicable: () => state.hasSelection,
      preventDefaultWhen: () => state.hasSelection,
      action: actions.nudgeUp,
    },
    {
      id: 'zoom-in',
      combo: { keys: ['='], mod: true },
      isApplicable: () => state.canvasActive === true,
      action: actions.zoomIn,
    },
    {
      id: 'zoom-out',
      combo: { keys: ['-'], mod: true },
      isApplicable: () => state.canvasActive === true,
      action: actions.zoomOut,
    },
    {
      id: 'zoom-reset',
      combo: { keys: ['0'], mod: true },
      isApplicable: () => state.canvasActive === true,
      action: actions.zoomReset,
    },
    { id: 'no-prevent', combo: { keys: ['b'] }, preventDefaultWhen: () => false, action: actions.noPrevent },
  ];
  const router = createShortcutRouter(bindings, {
    platform: state.platform,
    locked: () => state.locked,
  });
  return { router, actions };
}

describe('normalizeKey', () => {
  it('lowercases and treats +/= and _/- as equivalent', () => {
    expect(normalizeKey('C')).toBe('c');
    expect(normalizeKey('+')).toBe('=');
    expect(normalizeKey('=')).toBe('=');
    expect(normalizeKey('_')).toBe('-');
    expect(normalizeKey('-')).toBe('-');
    expect(normalizeKey('ArrowUp')).toBe('arrowup');
    expect(normalizeKey('Delete')).toBe('delete');
  });
});

describe('isTextEditingTarget', () => {
  it('detects INPUT, TEXTAREA and contentEditable; rejects others and null', () => {
    expect(isTextEditingTarget(el({ tagName: 'INPUT' }))).toBe(true);
    expect(isTextEditingTarget(el({ tagName: 'TEXTAREA' }))).toBe(true);
    expect(isTextEditingTarget(el({ tagName: 'DIV', isContentEditable: true }))).toBe(true);
    expect(isTextEditingTarget(el({ tagName: 'DIV', isContentEditable: false }))).toBe(false);
    expect(isTextEditingTarget(null)).toBe(false);
  });
});

describe('comboMatches', () => {
  it('matches +/= equivalence for a Mod+= / Mod++ (zoom) combo regardless of Shift', () => {
    const combo = { keys: ['='], mod: true };
    expect(comboMatches(combo, keyEvent('=', { metaKey: true }), 'mac')).toBe(true);
    expect(comboMatches(combo, keyEvent('+', { metaKey: true, shiftKey: true }), 'mac')).toBe(true);
  });

  it('anyModifiers matches the key ignoring modifier state', () => {
    const combo = { keys: ['delete', 'backspace'], anyModifiers: true };
    expect(comboMatches(combo, keyEvent('Delete', { metaKey: true, shiftKey: true, altKey: true }), 'mac')).toBe(true);
    expect(comboMatches(combo, keyEvent('x'), 'mac')).toBe(false);
  });
});

describe('createShortcutRouter — global guards', () => {
  it('G1: a text-editing target is ignored entirely (no action, no preventDefault) even when a combo matches', () => {
    for (const target of [el({ tagName: 'INPUT' }), el({ tagName: 'TEXTAREA' }), el({ tagName: 'DIV', isContentEditable: true })]) {
      const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
      const ev = keyEvent('c', { metaKey: true, target });
      router.handleKeydown(ev);
      expect(actions.copy).not.toHaveBeenCalled();
      expect(ev.preventDefault).not.toHaveBeenCalled();
    }
  });

  it('G2: a locked canvas makes every binding inert (no action, no preventDefault)', () => {
    const { router, actions } = makeRouter({ locked: true, platform: 'mac', hasSelection: true });
    const ev = keyEvent('c', { metaKey: true });
    router.handleKeydown(ev);
    expect(actions.copy).not.toHaveBeenCalled();
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });

  it('text-editing beats lock: still ignored when both locked and typing', () => {
    const { router, actions } = makeRouter({ locked: true, platform: 'mac', hasSelection: true });
    const ev = keyEvent('Delete', { target: el({ tagName: 'INPUT' }) });
    router.handleKeydown(ev);
    expect(actions.delete).not.toHaveBeenCalled();
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });
});

describe('createShortcutRouter — platform modifier matching', () => {
  it('matches Mod on metaKey on mac and on ctrlKey elsewhere', () => {
    const mac = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
    const macEv = keyEvent('c', { metaKey: true });
    mac.router.handleKeydown(macEv);
    expect(mac.actions.copy).toHaveBeenCalledTimes(1);
    expect(macEv.preventDefault).toHaveBeenCalledTimes(1);

    const other = makeRouter({ locked: false, platform: 'other', hasSelection: true });
    const otherEv = keyEvent('c', { ctrlKey: true });
    other.router.handleKeydown(otherEv);
    expect(other.actions.copy).toHaveBeenCalledTimes(1);
  });

  it('does not fire a Mod binding when the modifier is absent', () => {
    const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
    router.handleKeydown(keyEvent('c'));
    expect(actions.copy).not.toHaveBeenCalled();
  });

  it('wrong-modifier events never match (Ctrl+C on mac, Cmd+C elsewhere)', () => {
    const mac = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
    const macEv = keyEvent('c', { ctrlKey: true });
    mac.router.handleKeydown(macEv);
    expect(mac.actions.copy).not.toHaveBeenCalled();
    expect(macEv.preventDefault).not.toHaveBeenCalled();

    const other = makeRouter({ locked: false, platform: 'other', hasSelection: true });
    other.router.handleKeydown(keyEvent('c', { metaKey: true }));
    expect(other.actions.copy).not.toHaveBeenCalled();
  });

  it('discriminates Shift — Mod+Z undoes, Mod+Shift+Z redoes, plain Z does neither', () => {
    const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: true });

    router.handleKeydown(keyEvent('z', { metaKey: true }));
    expect(actions.undo).toHaveBeenCalledTimes(1);
    expect(actions.redo).not.toHaveBeenCalled();

    router.handleKeydown(keyEvent('z', { metaKey: true, shiftKey: true }));
    expect(actions.redo).toHaveBeenCalledTimes(1);

    router.handleKeydown(keyEvent('z'));
    expect(actions.undo).toHaveBeenCalledTimes(1); // unchanged — plain Z has no binding
  });
});

describe('createShortcutRouter — Delete/Backspace parity', () => {
  it('deletes and preventDefaults for Delete and Backspace when something is selected', () => {
    for (const key of ['Delete', 'Backspace']) {
      const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
      const ev = keyEvent(key);
      router.handleKeydown(ev);
      expect(actions.delete).toHaveBeenCalledTimes(1);
      expect(ev.preventDefault).toHaveBeenCalledTimes(1);
    }
  });

  it('is a no-op with no preventDefault when nothing is selected (native key preserved)', () => {
    const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: false });
    const ev = keyEvent('Delete');
    router.handleKeydown(ev);
    expect(actions.delete).not.toHaveBeenCalled();
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });

  it('fires regardless of held modifiers (anyModifiers)', () => {
    const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
    router.handleKeydown(keyEvent('Backspace', { metaKey: true, shiftKey: true }));
    expect(actions.delete).toHaveBeenCalledTimes(1);
  });
});

describe('createShortcutRouter — undo/redo bindings (US2)', () => {
  it('Mod+Z dispatches undo and preventDefaults', () => {
    const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
    const ev = keyEvent('z', { metaKey: true });
    router.handleKeydown(ev);
    expect(actions.undo).toHaveBeenCalledTimes(1);
    expect(actions.redo).not.toHaveBeenCalled();
    expect(ev.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('Mod+Shift+Z dispatches redo and preventDefaults; plain Z does neither', () => {
    const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
    const ev = keyEvent('z', { metaKey: true, shiftKey: true });
    router.handleKeydown(ev);
    expect(actions.redo).toHaveBeenCalledTimes(1);
    expect(actions.undo).not.toHaveBeenCalled();
    expect(ev.preventDefault).toHaveBeenCalledTimes(1);

    router.handleKeydown(keyEvent('z'));
    expect(actions.undo).not.toHaveBeenCalled();
    expect(actions.redo).toHaveBeenCalledTimes(1); // unchanged — plain Z has no binding
  });

  it('Mod+Y is unbound — no redo binding for it, no action, no preventDefault', () => {
    const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
    const ev = keyEvent('y', { metaKey: true });
    router.handleKeydown(ev);
    expect(actions.undo).not.toHaveBeenCalled();
    expect(actions.redo).not.toHaveBeenCalled();
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });

  it('a locked canvas makes undo/redo inert (no action, no preventDefault)', () => {
    const { router, actions } = makeRouter({ locked: true, platform: 'mac', hasSelection: true });
    const undoEv = keyEvent('z', { metaKey: true });
    router.handleKeydown(undoEv);
    expect(actions.undo).not.toHaveBeenCalled();
    expect(undoEv.preventDefault).not.toHaveBeenCalled();

    const redoEv = keyEvent('z', { metaKey: true, shiftKey: true });
    router.handleKeydown(redoEv);
    expect(actions.redo).not.toHaveBeenCalled();
    expect(redoEv.preventDefault).not.toHaveBeenCalled();
  });

  it('a text-editing target ignores undo/redo entirely (native field undo wins)', () => {
    const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
    const target = el({ tagName: 'INPUT' });
    const ev = keyEvent('z', { metaKey: true, target });
    router.handleKeydown(ev);
    expect(actions.undo).not.toHaveBeenCalled();
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });
});

describe('createShortcutRouter — preventDefault rules per binding', () => {
  it('preventDefaults by default when a binding dispatches', () => {
    const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
    const ev = keyEvent('c', { metaKey: true });
    router.handleKeydown(ev);
    expect(actions.copy).toHaveBeenCalledTimes(1);
    expect(ev.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('an applicable binding with preventDefaultWhen=false runs its action but preserves the default', () => {
    const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
    const ev = keyEvent('b');
    router.handleKeydown(ev);
    expect(actions.noPrevent).toHaveBeenCalledTimes(1);
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });

  it('arrow nudges and preventDefaults with a selection, but stays inert (no preventDefault) with none — page scroll survives', () => {
    const withSel = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
    const upWith = keyEvent('ArrowUp');
    withSel.router.handleKeydown(upWith);
    expect(withSel.actions.nudgeUp).toHaveBeenCalledTimes(1);
    expect(upWith.preventDefault).toHaveBeenCalledTimes(1);

    const noSel = makeRouter({ locked: false, platform: 'mac', hasSelection: false });
    const upWithout = keyEvent('ArrowUp');
    noSel.router.handleKeydown(upWithout);
    expect(noSel.actions.nudgeUp).not.toHaveBeenCalled();
    expect(upWithout.preventDefault).not.toHaveBeenCalled();
  });
});

describe('createShortcutRouter — shortcut pack (US3)', () => {
  it('Mod+A selects all and preventDefaults when the canvas is non-empty', () => {
    const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: false, hasElements: true });
    const ev = keyEvent('a', { metaKey: true });
    router.handleKeydown(ev);
    expect(actions.selectAll).toHaveBeenCalledTimes(1);
    expect(ev.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('Mod+A is a no-op with no preventDefault on an empty canvas', () => {
    const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: false, hasElements: false });
    const ev = keyEvent('a', { metaKey: true });
    router.handleKeydown(ev);
    expect(actions.selectAll).not.toHaveBeenCalled();
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });

  it('Escape clears selection but never preventDefaults (stays free for dialogs/menus)', () => {
    const { router, actions } = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
    const ev = keyEvent('Escape');
    router.handleKeydown(ev);
    expect(actions.escape).toHaveBeenCalledTimes(1);
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });

  it('Mod+D duplicates with a selection and preventDefaults; no-op (no preventDefault) without one', () => {
    const withSel = makeRouter({ locked: false, platform: 'mac', hasSelection: true });
    const evWith = keyEvent('d', { metaKey: true });
    withSel.router.handleKeydown(evWith);
    expect(withSel.actions.duplicate).toHaveBeenCalledTimes(1);
    expect(evWith.preventDefault).toHaveBeenCalledTimes(1);

    const noSel = makeRouter({ locked: false, platform: 'mac', hasSelection: false });
    const evWithout = keyEvent('d', { metaKey: true });
    noSel.router.handleKeydown(evWithout);
    expect(noSel.actions.duplicate).not.toHaveBeenCalled();
    expect(evWithout.preventDefault).not.toHaveBeenCalled();
  });

  it('zoom keys fire and block page zoom only when the canvas is the active target (G3)', () => {
    const active = makeRouter({ locked: false, platform: 'mac', hasSelection: false, canvasActive: true });

    const zin = keyEvent('=', { metaKey: true });
    active.router.handleKeydown(zin);
    expect(active.actions.zoomIn).toHaveBeenCalledTimes(1);
    expect(zin.preventDefault).toHaveBeenCalledTimes(1);

    const zinPlus = keyEvent('+', { metaKey: true, shiftKey: true }); // Mod++ normalizes to '='
    active.router.handleKeydown(zinPlus);
    expect(active.actions.zoomIn).toHaveBeenCalledTimes(2);
    expect(zinPlus.preventDefault).toHaveBeenCalledTimes(1);

    const zout = keyEvent('-', { metaKey: true });
    active.router.handleKeydown(zout);
    expect(active.actions.zoomOut).toHaveBeenCalledTimes(1);
    expect(zout.preventDefault).toHaveBeenCalledTimes(1);

    const zreset = keyEvent('0', { metaKey: true });
    active.router.handleKeydown(zreset);
    expect(active.actions.zoomReset).toHaveBeenCalledTimes(1);
    expect(zreset.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('zoom keys are left entirely to the browser when the canvas is NOT the active target', () => {
    const inactive = makeRouter({ locked: false, platform: 'mac', hasSelection: false, canvasActive: false });
    for (const ev of [keyEvent('=', { metaKey: true }), keyEvent('-', { metaKey: true }), keyEvent('0', { metaKey: true })]) {
      inactive.router.handleKeydown(ev);
      expect(ev.preventDefault).not.toHaveBeenCalled();
    }
    expect(inactive.actions.zoomIn).not.toHaveBeenCalled();
    expect(inactive.actions.zoomOut).not.toHaveBeenCalled();
    expect(inactive.actions.zoomReset).not.toHaveBeenCalled();
  });

  it('every pack binding is inert while locked (no action, no preventDefault)', () => {
    const { router, actions } = makeRouter({
      locked: true, platform: 'mac', hasSelection: true, hasElements: true, canvasActive: true,
    });
    const events = [
      keyEvent('a', { metaKey: true }),
      keyEvent('d', { metaKey: true }),
      keyEvent('Escape'),
      keyEvent('ArrowUp'),
      keyEvent('=', { metaKey: true }),
      keyEvent('0', { metaKey: true }),
    ];
    for (const ev of events) router.handleKeydown(ev);
    for (const fn of [actions.selectAll, actions.duplicate, actions.escape, actions.nudgeUp, actions.zoomIn, actions.zoomReset]) {
      expect(fn).not.toHaveBeenCalled();
    }
    for (const ev of events) expect(ev.preventDefault).not.toHaveBeenCalled();
  });

  it('every pack binding is ignored while typing in a text field (native behavior preserved)', () => {
    const target = el({ tagName: 'INPUT' });
    const { router, actions } = makeRouter({
      locked: false, platform: 'mac', hasSelection: true, hasElements: true, canvasActive: true,
    });
    const events = [
      keyEvent('a', { metaKey: true, target }),
      keyEvent('d', { metaKey: true, target }),
      keyEvent('Escape', { target }),
      keyEvent('ArrowUp', { target }),
      keyEvent('=', { metaKey: true, target }),
    ];
    for (const ev of events) router.handleKeydown(ev);
    for (const fn of [actions.selectAll, actions.duplicate, actions.escape, actions.nudgeUp, actions.zoomIn]) {
      expect(fn).not.toHaveBeenCalled();
    }
    for (const ev of events) expect(ev.preventDefault).not.toHaveBeenCalled();
  });
});
