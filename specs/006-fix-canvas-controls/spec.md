# Feature Specification: Canvas Controls & Viewport Fixes

**Feature Branch**: `006-fix-canvas-controls`

**Created**: 2026-07-19

**Status**: Draft

**Input**: User description: "Need to fix this issue. 1. Icons of full screen and fit to screen are same. 2. When in full screen mode, click on reset button and popup don't open. When you exit full screen popups was already there. 3. Canvas have 2 colors, 1 where the page is a white and background is gray. I can draw on gray but i want white background across the drawable canvas. 4. On click of fit to screen there should be a limit how much zoom is possible. Sometime it just zoom allot and canvas look bad. Check what is current max zoom percentage and ask me what should that percentage should be. 5. There should be a key to copy your own key to clipboard when I'm using the canvas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Confirmation and result popups work in full-screen (Priority: P1)

A learner puts the canvas into full-screen mode to focus on their design. They click the **Reset** button expecting the confirmation prompt to appear so they can confirm or cancel. Today, nothing visibly happens while full-screen; the prompt only appears (already waiting) after they exit full-screen. The same problem hides the scoring/results and AI-review popups while full-screen.

**Why this priority**: This is a functional break. A destructive action (Reset) appears to do nothing, and the user cannot confirm or cancel it while in the mode they are actively working in. It undermines trust in the controls and risks accidental resets. All canvas overlays share the same root cause, so fixing it restores several features at once.

**Independent Test**: Enter full-screen, click Reset, and verify the confirmation popup appears on top of the full-screen canvas and both Confirm and Cancel work. Repeat for the results and AI-review popups. Delivers value on its own without any other story.

**Acceptance Scenarios**:

1. **Given** the canvas is in full-screen mode, **When** the user clicks Reset, **Then** the confirmation popup appears immediately, on top of the full-screen canvas, without leaving full-screen.
2. **Given** the confirmation popup is showing in full-screen, **When** the user chooses Cancel, **Then** the popup closes and the canvas is unchanged.
3. **Given** the confirmation popup is showing in full-screen, **When** the user chooses Confirm, **Then** the canvas is reset and the popup closes.
4. **Given** the canvas is in full-screen mode, **When** an action opens the results popup or the AI-review popup, **Then** that popup is visible and interactive while still in full-screen.
5. **Given** the user opens a popup in full-screen and then exits full-screen, **Then** exactly one instance of the popup is shown (no duplicate/stale popup left behind).

---

### User Story 2 - Fit-to-screen never over-zooms (Priority: P1)

A learner with a small diagram (a few nodes) clicks **Fit to screen**. Today the view can zoom far in — well beyond the level the +/- zoom buttons allow — so nodes become huge and the canvas "looks bad." The user wants a sensible ceiling so fit-to-screen produces a clean, readable view every time.

**Why this priority**: Fit-to-screen is a primary, frequently used control (also triggered by keyboard and after auto-tidy). Producing an unusable view breaks the "immediate, predictable feedback" expectation and forces manual zoom correction after nearly every fit.

**Independent Test**: With a small diagram, click Fit to screen and confirm the resulting zoom does not exceed the agreed maximum (100%). With a large diagram, confirm it still zooms out to show everything.

**Acceptance Scenarios**:

1. **Given** a diagram small enough that it could theoretically be enlarged past 100%, **When** the user clicks Fit to screen, **Then** the zoom level stops at 100% (actual size) and does not zoom in further.
2. **Given** a diagram larger than the viewport, **When** the user clicks Fit to screen, **Then** the view zooms out so the entire diagram is visible with padding.
3. **Given** an empty or single-node canvas, **When** the user clicks Fit to screen, **Then** the view settles at a reasonable, centered zoom no greater than 100% (no extreme zoom).
4. **Given** fit-to-screen was triggered indirectly (e.g., after auto-tidy or via the reset-zoom keyboard shortcut), **Then** the same 100% ceiling applies.

---

### User Story 3 - Full-screen and fit-to-screen buttons are distinguishable (Priority: P2)

A learner scanning the canvas toolbar needs to tell the **Full screen** and **Fit to screen** buttons apart at a glance. Today both use nearly identical four-corner-bracket icons and are easy to confuse.

**Why this priority**: Ambiguous icons cause mis-clicks and hesitation on two common controls, but the controls still function — so it ranks below the outright breakages above.

**Independent Test**: Look at the toolbar (and hover each button) and confirm the two controls are visually distinct and each has a clear label/tooltip identifying its function.

**Acceptance Scenarios**:

1. **Given** the canvas toolbar, **When** the user views the Full screen and Fit to screen buttons, **Then** the two icons are visually distinct and not mistakable for each other at toolbar size.
2. **Given** either button, **When** the user hovers it, **Then** a tooltip/label clearly states its function ("Full screen" vs "Fit to screen").
3. **Given** the toolbar is viewed on a tablet-sized (≥768 px) viewport, **Then** the two icons remain distinguishable.

---

### User Story 4 - The drawable canvas has a single white background (Priority: P2)

A learner sees the drawable area rendered in gray while the surrounding page is white, creating two competing background colors. They want the whole area they can draw on to be white for a cleaner, less distracting workspace.

**Why this priority**: A visual-consistency improvement that raises polish and reduces distraction, but the canvas is fully usable today — so it ranks below functional breakages.

**Independent Test**: Open the playground in the default (light) theme and confirm the drawable canvas area is white edge-to-edge, with no gray region, while nodes and other UI remain clearly readable.

**Acceptance Scenarios**:

1. **Given** the light theme, **When** the user views the playground, **Then** the drawable canvas area is white across its full extent (no gray zone between the page and the drawing surface).
2. **Given** the white canvas, **When** the user views node cards, minimap, and popups, **Then** they remain visually distinguishable against the white background (adequate contrast/borders).
3. **Given** the orientation dot-grid on the canvas, **When** the background becomes white, **Then** the grid dots remain faintly visible for spatial reference (not invisible, not harsh).

---

### User Story 5 - Copy my own access key from the canvas (Priority: P3)

A learner working on the canvas wants to copy their own access key (the key they use to return to their workspace) to the clipboard without leaving the playground or hunting through other screens.

**Why this priority**: A genuine convenience that reduces friction for saving/reusing the key, but it is a net-new nicety rather than a fix to broken behavior.

**Independent Test**: While on the canvas, use the copy-key control and paste the clipboard contents elsewhere to confirm it matches the user's full access key, with on-screen confirmation that it copied.

**Acceptance Scenarios**:

1. **Given** the user is on the canvas with a workspace key active, **When** they click the "Copy my key" control in the canvas controls, **Then** their full access key is placed on the clipboard.
2. **Given** the key was copied, **When** the copy completes, **Then** the user sees a brief confirmation (e.g., a "Copied" state) so they know it succeeded.
3. **Given** the clipboard is unavailable or the copy fails, **When** the user clicks the control, **Then** they see a clear, non-blocking error/feedback rather than a silent failure.
4. **Given** the copied value, **When** the user pastes it, **Then** it is the complete, usable key (not a masked or truncated form).

---

### Edge Cases

- **Fit-to-screen on empty canvas**: must settle at a sane, centered zoom (≤100%), not an extreme value.
- **Full-screen entered/exited rapidly while a popup is open**: only one live popup instance should remain; no stale copy left over after exiting full-screen.
- **Full-screen requested but denied by the browser**: controls must still behave sensibly (popups appear in normal mode).
- **Copy-key with no key present**: the control should be hidden/disabled or give clear feedback rather than copying an empty value.
- **Dark theme**: the white-background change targets the light theme; the dark theme must remain internally consistent (no half-changed appearance).
- **Very large diagram fit**: zoom-out must still show the whole diagram with padding; the 100% ceiling only limits zoom-*in*.

## Requirements *(mandatory)*

### Functional Requirements

**Full-screen popups (US1)**

- **FR-001**: The Reset confirmation popup MUST be visible and fully interactive (Confirm and Cancel) while the canvas is in full-screen mode, appearing on top of the full-screen canvas without requiring the user to exit full-screen.
- **FR-002**: The results/scoring popup and the AI-review popup MUST also be visible and interactive while the canvas is in full-screen mode.
- **FR-003**: When a popup is opened in full-screen and full-screen is later exited, the system MUST NOT leave a duplicate or stale popup behind (exactly one instance shown).

**Fit-to-screen zoom limit (US2)**

- **FR-004**: Fit-to-screen MUST NOT increase zoom beyond 100% (actual size); it MAY zoom out below 100% to fit larger diagrams.
- **FR-005**: The 100% ceiling MUST apply to every path that triggers fit-to-screen, including the toolbar button, the reset-zoom keyboard shortcut, and post-auto-tidy fitting.
- **FR-006**: For large diagrams, fit-to-screen MUST continue to zoom out enough to display the entire diagram within the viewport, preserving existing padding around the content.

**Distinguishable controls (US3)**

- **FR-007**: The Full screen and Fit to screen buttons MUST use visually distinct icons that a user can tell apart at toolbar size.
- **FR-008**: Each of the two buttons MUST expose a clear label/tooltip identifying its function ("Full screen", "Fit to screen").

**White canvas background (US4)**

- **FR-009**: In the default (light) theme, the entire drawable canvas area MUST render with a single white background — no gray region between the surrounding page and the drawing surface.
- **FR-010**: Node cards, minimap, and popups MUST remain clearly distinguishable against the white canvas (adequate contrast or borders).
- **FR-011**: The orientation dot-grid MUST remain faintly visible on the white background for spatial reference.

**Copy own key (US5)**

- **FR-012**: The canvas controls MUST include a visible "Copy my key" button that copies the user's full access key to the clipboard.
- **FR-013**: The button MUST provide brief visual confirmation when the copy succeeds.
- **FR-014**: The copied value MUST be the complete, usable access key — not a masked or truncated form.
- **FR-015**: If copying fails or no key is available, the system MUST give clear, non-blocking feedback rather than failing silently or copying an empty value.

### Non-Functional / Consistency Requirements

- **FR-016**: All changed controls MUST provide immediate visual feedback (perceived response under ~100 ms) consistent with the rest of the interface.
- **FR-017**: The changes MUST remain fully functional and visually correct on desktop and tablet viewports (≥768 px).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In full-screen mode, 100% of attempts to open the Reset confirmation, results, and AI-review popups display an interactive popup on the first click, with no need to exit full-screen.
- **SC-002**: After clicking Fit to screen on any diagram, the resulting zoom level is at most 100% in 100% of cases, and the entire diagram remains visible.
- **SC-003**: In a quick usability check, users correctly identify which button is Full screen and which is Fit to screen on first look at least 90% of the time.
- **SC-004**: In the light theme, the drawable canvas area shows one continuous white background with no visible gray region.
- **SC-005**: Users can copy their own access key from the canvas in a single action, and the pasted value matches their full key 100% of the time, with visible confirmation.
- **SC-006**: No regressions: existing zoom in/out (25%–250%), pan, undo/redo, and node interactions continue to behave as before.

## Assumptions

- **Fit-to-screen ceiling = 100%** (confirmed with the requester). Current behavior: the +/- zoom buttons clamp between 25% and 250%, but fit-to-screen is unbounded and can exceed 250%; this feature caps fit-to-screen zoom-in at 100% while leaving the manual button range (25%–250%) unchanged.
- **Copy-key mechanism = toolbar button only** (confirmed with the requester); no keyboard shortcut is added for this action, avoiding conflicts with the existing copy-selection shortcut.
- The white-background change applies to the **light theme**; the dark theme keeps its existing dark canvas appearance.
- The dot-grid orientation pattern is retained (adjusted for visibility) rather than removed.
- "Popups was already there" is understood as the popups rendering outside the full-screen surface — so fixing full-screen visibility for the confirmation dialog also fixes the results and AI-review popups, which share the same behavior.
- No new backend endpoints or data are required; the access key already exists in the user's workspace and is only being surfaced for copy on the canvas.
- The existing full-screen mechanism and the third-party canvas/zoom library are retained; this feature adjusts their configuration and the overlay rendering context rather than replacing them.
