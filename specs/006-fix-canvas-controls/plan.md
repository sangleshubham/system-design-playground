# Implementation Plan: Canvas Controls & Viewport Fixes

**Branch**: `006-fix-canvas-controls` | **Date**: 2026-07-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-fix-canvas-controls/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Frontend-only fix-pack for the shared playground canvas (used by both the level playground
and sandbox pages), five user stories: (P1) popups — Reset confirmation, results, AI review —
must render **inside** full-screen mode; (P1) fit-to-screen must never zoom past **100%**;
(P2) the Full-screen and Fit-to-screen toolbar icons must be distinguishable; (P2) the
drawable canvas gets a single **white** background in the light theme; (P3) a **"Copy my
key"** toolbar button copies the full access key with success/failure feedback.

Technical approach (research.md R1–R6): register Angular CDK's built-in
`FullscreenOverlayContainer` so CDK dialogs follow the fullscreen element, and move the two
inline dialogs into the `#canvasArea` fullscreen subtree (R1); clamp `fitToView()` post-fit
— `getScale() > 1` → `resetScaleAndCenter(true)` — at the single choke point all three fit
triggers already funnel through (R2); replace the `fit` glyph and add a `fullscreen-exit`
state icon in the shared icon registry (R3); flip one theme token, light-theme
`--canvas-bg` → `var(--surface-0)` (R4); add a `KeyService`-backed copy button to the
canvas controls with awaited clipboard write (R5). **No backend, API, or dependency
changes.**

This plan additionally defines an **Agent Execution Model** (below): every phase names the
agent type, model, and reasoning-effort setting to pre-select when spawning subagents, and
marks which work items run in parallel. It is written so small Sonnet-class coding models
can execute each work item independently.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Angular 20.3 — standalone components,
Angular Signals, `ChangeDetectionStrategy.OnPush`. Backend (Node.js 22/Express 5) is
untouched by this feature.

**Primary Dependencies**: `@foblex/flow` 19.0.0 (canvas: `fitToScreen`, `getScale`,
`resetScaleAndCenter`, `FZoomDirective` 25–250% clamp), `@angular/cdk` 20.2 (`Overlay`,
**`FullscreenOverlayContainer`**). **No new dependencies** (Constitution Principle III).

**Storage**: N/A — no persistence changes. The access key already lives in `localStorage`
(`sdp.accessKey`) behind `KeyService` (`frontend/src/app/core/key.service.ts`); it is read,
never written, by this feature.

**Testing**: `ng test --no-watch` (Vitest, co-located `*.spec.ts`), `npm run lint`
(ESLint). New unit tests: fit clamp, copy-key handler, overlay-container provider, icon
registry (research.md R6). Visual checks scripted in [quickstart.md](./quickstart.md).

**Target Platform**: Evergreen desktop/tablet browsers, viewports ≥ 768 px (FR-017).
Fullscreen API with graceful denial fallback; Clipboard API with failure feedback.

**Project Type**: Web application (`frontend/` + `backend/` at repo root); this feature
touches `frontend/` only.

**Performance Goals**: 60 fps canvas interactions unchanged (clamp is O(1) arithmetic after
fit); < 100 ms perceived feedback for every control (copied state, popup open, icon state
swap) per Constitution Principle II and FR-016.

**Constraints**: fit ceiling = 100% while manual zoom stays 25%–250% (spec assumption);
light-theme-only background change, dark theme untouched; exactly one popup instance across
fullscreen enter/exit (FR-003); copied key is complete and unmasked (FR-014); no keyboard
shortcut for copy-key (avoids Mod+C collision).

**Scale/Scope**: 5 user stories; ~8 existing files edited + ~3 test specs touched/added;
0 new routes, 0 new endpoints, 2 new icon registry entries, 1 token change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Verdict | Evidence |
|---|-----------|---------|----------|
| I | Interactivity-First | ✅ PASS | Feature repairs and extends hands-on canvas controls (fullscreen confirm/cancel, fit, copy-key feedback states) — no passive content added. |
| II | Simplicity & Ease of Use | ✅ PASS | Distinguishable icons + explicit tooltips (FR-007/008); immediate feedback < 100 ms for copy/fullscreen/fit (FR-016); no new flows to learn; popups now behave as users already expect. |
| III | Fixed Technology Stack | ✅ PASS | Angular + TypeScript only; zero new dependencies — `FullscreenOverlayContainer` ships in the existing `@angular/cdk`; `@foblex/flow` used via public API only (no fork/patch, research.md R2). |
| IV | Modular Component Architecture | ✅ PASS | Changes stay inside the shared canvas components (`canvas/`, `shared/icon.registry.ts`, `shared/confirm-dialog` path untouched), one app-level provider, one token. No copy-paste between playground and sandbox — both inherit fixes through the shared components. No API surface changes. |
| V | Performance & Responsiveness | ✅ PASS | O(1) post-fit clamp; no added rendering work; ≥ 768 px layouts unaffected (toolbar gains one button within existing pattern); 60 fps interactions untouched. |

**Post-Phase-1 re-check (2026-07-19)**: design artifacts (data-model.md, contracts/,
quickstart.md) introduce no violations — verdicts unchanged. Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/006-fix-canvas-controls/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── ui-contracts.md  # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── app/
│   │   ├── app.config.ts                                  # EDIT US1: FullscreenOverlayContainer provider
│   │   ├── core/
│   │   │   └── key.service.ts                             # READ-ONLY US5: key() / hasKey()
│   │   ├── features/playground/
│   │   │   ├── playground.page.html                       # EDIT US1: move 2 dialogs into #canvasArea
│   │   │   └── canvas/
│   │   │       ├── canvas.component.ts                    # EDIT US2: fitToView() clamp
│   │   │       ├── canvas-controls.component.ts           # EDIT US3+US5: exit-icon state, copy-key handler
│   │   │       ├── canvas-controls.component.html         # EDIT US3+US5: labels/icons, copy-key button
│   │   │       ├── canvas-controls.component.scss         # EDIT US5: copied/error state styling (if needed)
│   │   │       └── canvas-controls.component.spec.ts      # EDIT US5: copy-key tests
│   │   └── shared/
│   │       └── icon.registry.ts                           # EDIT US3+US5: fit, fullscreen-exit, key icons
│   └── styles/
│       └── _tokens.scss                                   # EDIT US4: light --canvas-bg → var(--surface-0)
└── tests: co-located *.spec.ts (Vitest); new fit-clamp spec beside canvas.component.ts

backend/                                                   # UNTOUCHED
```

**Structure Decision**: Existing web-application layout (`frontend/` + `backend/`) is kept;
all edits land in the frontend playground feature, its shared canvas components, the shared
icon registry, one app-level provider, and one theme token. The sandbox page receives US1
(confirm dialog), US3, and US5 for free through the shared `CanvasControlsComponent`.

## Agent Execution Model

*This section pre-selects the subagent type, model, and reasoning effort for every phase so
an orchestrator (running a small Sonnet-class model itself) can spawn workers without
making those decisions at run time. `[P]` = items inside the same wave run in parallel —
their file sets are disjoint (see conflict matrix). Spawn syntax: Agent tool →
`subagent_type` + `model`; Workflow scripts → `agent(prompt, { agentType, model, effort })`.*

### File-conflict matrix (drives the waves)

| Work item | Files written | Conflicts with |
|---|---|---|
| US1 fullscreen popups | `app.config.ts`, `playground.page.html` | — |
| US2 fit clamp | `canvas.component.ts` (+ new spec file) | — |
| US3 icons | `icon.registry.ts`, `canvas-controls.component.{html,ts}` | US5 |
| US4 white canvas | `_tokens.scss` | — |
| US5 copy key | `canvas-controls.component.{ts,html,scss,spec.ts}`, `icon.registry.ts` | US3 |

US3 and US5 share two files → they are sequenced (US3 first: higher priority P2 vs P3).
Everything else is disjoint and parallel-safe in one shared workspace (no worktree
isolation needed; use `isolation: 'worktree'` only if the orchestrator batches US3+US5
concurrently anyway, which this plan does not).

### Wave 0 — Context priming (optional, read-only)

| Item | Agent | Model | Effort | Parallel |
|---|---|---|---|---|
| Verify research.md file:line anchors still valid (post-rebase runs only) | `Explore` | haiku | low | [P] single item |

Skip on a clean checkout of this branch; research.md anchors were verified 2026-07-19.

### Wave 1 — Independent user stories (4 agents in parallel)

| Item | Scope (contract in contracts/ui-contracts.md) | Agent | Model | Effort | Parallel |
|---|---|---|---|---|---|
| 1a — US1 fullscreen popups | Add `{ provide: OverlayContainer, useClass: FullscreenOverlayContainer }` to `app.config.ts`; move results-dialog and AI-review `@if` blocks inside `#canvasArea` in `playground.page.html`; add provider unit test | `general-purpose` | sonnet | medium | [P] |
| 1b — US2 fit-to-screen clamp | Rewrite `fitToView()` per research.md R2 (fit → `getScale()` → clamp via `resetScaleAndCenter(true)` when `>1` or non-finite); add clamp unit tests (mocked `FCanvasComponent`) | `general-purpose` | sonnet | medium | [P] |
| 1c — US4 white canvas | Change light `--canvas-bg` to `var(--surface-0)` in `_tokens.scss:72`; leave dark token and `--canvas-dot` untouched | `general-purpose` | haiku | low | [P] |
| 1d — US3 icons | Replace `fit` glyph, add `fullscreen-exit` glyph in `icon.registry.ts`; switch fullscreen button icon/label on `isFullscreen`; update titles/aria-labels to "Full screen"/"Fit to screen (⌘0)"; registry unit test | `general-purpose` | sonnet | low | [P] |

Gate to Wave 2: item 1d merged (US5 edits the same files). 1a–1c do NOT gate Wave 2.

### Wave 2 — Dependent story (starts when 1d lands; runs alongside any still-running 1a–1c)

| Item | Scope | Agent | Model | Effort | Parallel |
|---|---|---|---|---|---|
| 2a — US5 copy key | Add `key` (+ `check` if absent) icons; add hidden-when-keyless "Copy my key" button to canvas controls; handler injects `KeyService`, awaits `navigator.clipboard.writeText(keys.key()!)`, 1.5 s copied/error states; unit tests (mock clipboard, `hasKey` false/true, reject path) | `general-purpose` | sonnet | medium | [P] with 1a/1b/1c only |

### Wave 3 — Verification & integration (after ALL of Waves 1–2)

| Item | Scope | Agent | Model | Effort | Parallel |
|---|---|---|---|---|---|
| 3a — Static gates | `cd frontend && npm run lint && npm test` — fix anything red (constitution quality gate) | `general-purpose` | sonnet | medium | [P] |
| 3b — Adversarial code review | Review the full diff against spec FR-001…FR-017 + constitution; report findings with file:line; verify no `maskKey` leak into copy path, single-popup invariant, dark theme untouched | `general-purpose` | sonnet | high | [P] |
| 3c — Manual/visual QA script | Execute quickstart.md scenarios (fullscreen popups on playground AND sandbox, fit ≤ 100%, icon distinctness, white canvas contrast, copy-paste key roundtrip); needs a human or browser-capable agent — flag results, don't self-certify | `general-purpose` | sonnet | medium | [P] |

Findings from 3b/3c loop back as fix items (agent: `general-purpose`, model: sonnet,
effort: medium, parallel per the same conflict matrix). Exit when 3a is green and 3b/3c
report no open P1/P2 findings.

### Orchestrator guidance

- The orchestrator itself needs no more than **sonnet / medium effort**: all design
  decisions are pre-made in research.md and contracts/ui-contracts.md; worker prompts
  should quote the relevant research section and contract verbatim.
- Each worker prompt MUST include: the work-item scope row above, the matching
  research.md section (R1–R6), the matching contract section, and the file list it may
  write (enforce the conflict matrix).
- Workers MUST run `npm test -- --run <touched spec>` locally before reporting done;
  Wave 3a remains the integration gate.
- Every user story is independently testable (constitution workflow rule): each wave item
  maps 1:1 to a spec user story with its own acceptance scenarios.

## Complexity Tracking

> No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
