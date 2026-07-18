# Feature Specification: Interactive System Design Playground

**Feature Branch**: `001-system-design-playground`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "ScaleDojo-style system design practice platform, rescoped as a
personal single-user website: no payments, no blogs, no marketing homepage, no credits
economy, no leaderboard — just a really good interactive playground with progressive
challenges, a challenge map, and progress tracking."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Solve a Design Challenge in the Playground (Priority: P1)

The learner opens a challenge level and lands in a three-panel playground: a component
palette on the left, an infinite pan/zoom design canvas in the center, and the challenge
brief on the right. They read the problem narrative and design specifications
(functional needs, non-functional targets, constraints, budget, capacity assumptions,
key trade-off, optional bonus). They drag components (Client, CDN, Load Balancer,
databases, caches, queues, etc.) from the palette onto the canvas and connect them with
directed data-flow edges. As the canvas changes, the mission checklist ("Add a Client",
"Connect Client → CDN", …) checks items off automatically in real time. When the
missions look satisfied, the learner presses RUN. The design is evaluated and scored
across five dimensions — Missions, Flow, Topology, Efficiency, Resilience — with
per-dimension feedback explaining what passed and what failed. A total score of 90 or
above marks the level complete.

**Why this priority**: This is the entire value proposition — the hands-on
design-build-evaluate loop. Every other feature exists to feed learners into this loop.

**Independent Test**: Seed one level. Open it, place and connect the required
components, watch missions auto-check, press RUN, receive a five-dimension score with
feedback, and see the level marked complete when the score is ≥ 90. This alone is a
usable product.

**Acceptance Scenarios**:

1. **Given** an open level with an empty canvas, **When** the learner drags a component
   from the palette onto the canvas, **Then** a node appears at the drop position and
   any "Add [component]" mission matching it is checked off immediately.
2. **Given** two nodes on the canvas, **When** the learner drags from one node's
   connection handle to the other, **Then** a directed edge is created and any matching
   "Connect A → B" mission is checked off immediately.
3. **Given** a canvas that satisfies all required missions, **When** the learner presses
   RUN, **Then** the system returns a score for each of the five dimensions, a total
   score, and per-dimension feedback text.
4. **Given** an evaluation with total score ≥ 90, **When** results are shown, **Then**
   the level is marked complete and the learner is offered navigation to the next level.
5. **Given** an evaluation with total score < 90, **When** results are shown, **Then**
   the feedback identifies the failing dimensions and the learner can revise the design
   and RUN again without losing canvas state.
6. **Given** a mission that is checked off, **When** the learner deletes the node or
   edge that satisfied it, **Then** the mission unchecks immediately.

---

### User Story 2 - Full Canvas Editing & Palette Ergonomics (Priority: P2)

The learner works comfortably on non-trivial designs. The palette offers search, a
"Recommended for this level" section (components badged as needed), and a toggle to
show the full catalog of ~42 components grouped by category (User, Networking, Compute,
Storage, Caching, Messaging, Services), each with an icon, technology label, and a
metadata card showing description, cost per hour, and latency. On the canvas the learner
can select, move, and delete nodes and edges; rename a node by double-clicking its
label; attach sticky-note annotations; undo and redo any edit; reset the canvas; and use
canvas controls for zoom in/out, fit-to-view, lock, tidy/auto-arrange, and fullscreen.

**Why this priority**: The playground from User Story 1 is functional but frustrating
without editing ergonomics. This story turns it from a demo into a tool that feels good —
the "really good interaction" the product is defined by.

**Independent Test**: On any level, build a 10-node design using palette search and the
recommended filter, rename two nodes, add a note, make five edits, undo all five, redo
two, tidy the layout, and toggle fullscreen — all without errors or lost state.

**Acceptance Scenarios**:

1. **Given** the palette, **When** the learner types in the search box, **Then** the
   component list filters to matches as they type.
2. **Given** a level with recommended components, **When** the palette is in
   "recommended" mode, **Then** only the needed components are listed with a "NEEDED"
   badge, and toggling "Show all" reveals the full categorized catalog.
3. **Given** any component in the palette, **When** the learner hovers or clicks its
   info affordance, **Then** a card shows its description, cost per hour, and latency.
4. **Given** a sequence of canvas edits, **When** the learner triggers undo repeatedly,
   **Then** each edit reverts in reverse order, and redo re-applies reverted edits.
5. **Given** a node on the canvas, **When** the learner double-clicks its label and
   types a new name, **Then** the node displays the new name while still counting as its
   original component type for missions and scoring.
6. **Given** a cluttered canvas, **When** the learner presses tidy, **Then** nodes are
   auto-arranged into a readable layout without changing any connections.

---

### User Story 3 - Challenge Map with Acts & Sequential Unlocking (Priority: P3)

The learner browses the Architecture Lab's curriculum map: levels grouped into themed
"Acts" of increasing difficulty (The Fundamentals, Async & Real-Time, Data-Intensive
Systems, …), each Act showing its own progress. Each level card shows its number, title,
difficulty badge (Easy / Medium / Hard / Expert / Legendary), a short description,
learning-objective chips, and mission count. Levels unlock strictly in sequence:
completing a level unlocks the next; locked levels show a lock icon and cannot be
opened. A search box filters levels by name, difficulty, or topic, and a summary shows
overall progress (e.g., "3/70 completed").

**Why this priority**: Progression gives the playground a curriculum and a reason to
return, but a single directly-opened level (Story 1) is valuable without it.

**Independent Test**: With a seeded catalog, verify only level 1 is open initially,
complete level 1 in the playground, return to the map, and confirm level 2 is now
unlocked, Act progress reads "1/N", and searching by a level title filters the grid.

**Acceptance Scenarios**:

1. **Given** a fresh install, **When** the learner opens the challenge map, **Then**
   only the first level is unlocked and all others show a lock icon and reject clicks.
2. **Given** the learner completes level N, **When** they return to the map, **Then**
   level N is marked complete and level N+1 is unlocked.
3. **Given** the search box, **When** the learner types a title fragment, difficulty, or
   topic keyword, **Then** the level grid filters to matching levels.
4. **Given** the map, **When** it renders, **Then** each Act displays its own completed
   count and the header shows total progress across the lab.

---

### User Story 4 - Progress Persistence & Resume (Priority: P4)

The learner's work survives closing the browser. Canvas state for each level is saved
automatically as they edit, completion status and best scores persist, and a simple home
view shows overall lab progress, a "Continue where you left off" card that reopens the
last level exactly as it was, and a "Recommended next" pointer to the next unlocked
challenge.

**Why this priority**: Persistence makes progression real across sessions; without it
Stories 1–3 still demo well within a single sitting.

**Independent Test**: Build a partial design on a level, close and reopen the browser,
use "Continue where you left off", and confirm the canvas, mission states, and map
progress are exactly as they were left.

**Acceptance Scenarios**:

1. **Given** an in-progress design, **When** the learner closes the app and returns
   later, **Then** reopening the level restores all nodes, edges, renames, and notes.
2. **Given** prior activity, **When** the learner opens the home view, **Then** a
   "Continue where you left off" card names the last-touched level and one click
   reopens it.
3. **Given** a completed level with multiple attempts, **When** progress is displayed,
   **Then** the best total score is shown for that level.

---

### User Story 5 - Free-Form Sandbox (Priority: P5)

The learner opens a sandbox: the same canvas and full component palette with no
missions, no scoring, and no unlock constraints — a space to sketch arbitrary
architectures. Sandbox designs are saved and can be reopened and renamed.

**Why this priority**: Pure convenience built from parts that already exist after
Stories 1–2 and 4; valuable, but nothing else depends on it.

**Independent Test**: Open the sandbox, build any design using the full palette, close
and reopen it, and confirm the design persists with no mission or scoring UI present.

**Acceptance Scenarios**:

1. **Given** the sandbox, **When** it opens, **Then** the full component catalog is
   available and no mission checklist, brief, or RUN scoring flow is shown.
2. **Given** a saved sandbox design, **When** the learner reopens the sandbox list,
   **Then** they can resume or rename any saved design.

---

### Edge Cases

- RUN pressed on an empty or trivially incomplete canvas → evaluation returns a low
  score with feedback naming the missing missions, never an error.
- Duplicate edges between the same pair of nodes and self-loops (node connected to
  itself) are rejected at creation time with visible feedback.
- A design's summed component cost exceeds the level's budget → Efficiency dimension
  reflects the overage and feedback states the budget and actual figures.
- Disconnected sub-graphs (components placed but not wired into any flow) → Flow and
  Topology feedback identifies the orphaned components.
- Multiple nodes of the same component type on the canvas → missions count correctly
  (an "Add a CDN" mission is satisfied by at least one CDN; deleting one of two CDNs
  does not uncheck it).
- Browser refresh or crash mid-edit → autosaved state loses at most a few seconds of
  work.
- Large designs (~50 nodes) → canvas interaction remains smooth; no editing operation
  becomes unusable.
- Undo history exhausted → undo control disables rather than erroring.
- Level content missing or malformed → the map shows the level as unavailable with a
  clear message instead of opening a broken playground.

## Requirements *(mandatory)*

### Functional Requirements

#### Playground & Canvas

- **FR-001**: System MUST present each level as a three-panel playground: component
  palette (left), design canvas (center), challenge context (right).
- **FR-002**: Users MUST be able to drag components from the palette and drop them onto
  the canvas as nodes at the drop position.
- **FR-003**: Users MUST be able to create a directed edge by dragging from one node's
  connection handle to another node.
- **FR-004**: Users MUST be able to select, move, and delete nodes and edges, rename a
  node via double-click, and attach a free-text note to a node.
- **FR-005**: System MUST reject invalid connections (self-loops, duplicate edges
  between the same node pair) with immediate visual feedback.
- **FR-006**: System MUST provide undo and redo covering every canvas mutation (add,
  delete, move, connect, rename, note), plus a reset action that clears the canvas
  after confirmation.
- **FR-007**: System MUST provide canvas controls: zoom in, zoom out, fit-to-view, pan,
  lock (read-only), tidy/auto-arrange, and fullscreen.
- **FR-008**: Every canvas interaction (drop, connect, select, mission check) MUST give
  visible feedback within 100 ms of the user action.

#### Component Catalog & Palette

- **FR-009**: System MUST ship a component catalog of ~42 components grouped into seven
  categories (User, Networking, Compute, Storage, Caching, Messaging, Services), each
  with a display name, technology label, category icon, description, cost per hour, and
  latency figure.
- **FR-010**: Palette MUST support text search filtering and a toggle between
  "recommended for this level" (components badged NEEDED) and the full catalog.
- **FR-011**: Palette MUST expose each component's metadata (description, cost,
  latency) via a hover/click card.
- **FR-012**: Palette MUST include a draggable sticky-note item for canvas annotations.

#### Challenge Content & Missions

- **FR-013**: Each level MUST define: number, title, difficulty tier (Easy / Medium /
  Hard / Expert / Legendary), narrative problem description, and design specifications
  with labeled sections — Functional, Non-Functional, Constraints, Budget, Capacity,
  Key Trade-off, and optional Bonus.
- **FR-014**: Each level MUST define a mission checklist of concrete, automatically
  verifiable tasks of at least two kinds: "add component X" and "connect X → Y",
  plus optional bonus missions.
- **FR-015**: System MUST re-evaluate mission satisfaction on every canvas change and
  update the checklist and its progress counter (e.g., "3/6") without user action.
- **FR-016**: Renamed nodes MUST still satisfy missions and scoring by their underlying
  component type.
- **FR-017**: Each level MAY provide ordered hints that the user reveals on demand; all
  hints are free of charge.

#### Evaluation & Scoring

- **FR-018**: A RUN action MUST evaluate the current design and return numeric scores
  for five dimensions — Missions, Flow, Topology, Efficiency, Resilience — and a total
  score on a 0–100 scale.
- **FR-019**: Evaluation MUST return human-readable feedback per dimension explaining
  what passed and what failed, including budget/latency figures where relevant.
- **FR-020**: A total score ≥ 90 MUST mark the level complete; lower scores leave the
  canvas intact for revision and re-run. Users MUST be able to re-run without limit.
- **FR-021**: Evaluation results MUST be presented within 5 seconds of pressing RUN.
- **FR-022**: System MUST record each attempt's per-dimension scores, total, and
  pass/fail, and retain the best score per level.

#### Progression & Challenge Map

- **FR-023**: System MUST present the Architecture Lab as a challenge map of levels
  grouped into named Acts of increasing difficulty, each Act with its own progress
  count and the lab with an overall progress summary.
- **FR-024**: Levels MUST unlock strictly sequentially: only the first level is
  unlocked initially; completing a level unlocks the next. Locked levels display a lock
  indicator and cannot be opened.
- **FR-025**: The map MUST support filtering levels by name, difficulty, or topic
  keyword.
- **FR-026**: Level cards MUST display number, title, difficulty badge, short
  description, learning-objective chips, and mission count.

#### Persistence & Home

- **FR-027**: System MUST autosave the working canvas (nodes, edges, positions,
  renames, notes) continuously, losing at most a few seconds of edits on abrupt exit.
- **FR-028**: All progress (completions, best scores, unlocks, last-touched level) MUST
  persist across sessions without requiring sign-in; the product serves a single user.
- **FR-029**: A home view MUST show lab progress, a "Continue where you left off" card
  reopening the last-touched level in its saved state, and a "Recommended next"
  pointer to the next unlocked, uncompleted level.

#### Sandbox

- **FR-030**: System MUST provide a free-form sandbox using the same canvas and full
  palette with no missions, scoring, or unlock constraints; sandbox designs are saved,
  listed, renamable, and reopenable.

#### General Experience

- **FR-031**: The interface MUST offer light and dark themes with a persistent toggle.
- **FR-032**: All primary destinations (playground for the current level, challenge
  map, sandbox) MUST be reachable within 3 clicks of the home view.

### Key Entities

- **Component**: A catalog entry representing a real infrastructure building block —
  name, category, technology label, description, cost per hour, latency, icon.
- **Act**: A named, ordered group of levels forming a difficulty tier; has a title and
  derived progress.
- **Level**: A challenge — order, title, difficulty, narrative, specification sections
  (functional, non-functional, constraints, budget, capacity, trade-off, bonus),
  mission list, recommended component list, hint list, and its position in the unlock
  sequence.
- **Mission**: An auto-verifiable task within a level — kind (add / connect / bonus),
  target component type(s), and its check rule.
- **Design**: The user's canvas state for a level or sandbox — nodes (component type,
  position, display name, note), directed edges, and sticky notes.
- **Attempt**: One evaluation of a design — five dimension scores, total, pass/fail,
  and feedback text.
- **Progress**: The single user's state — per-level completion and best score, unlock
  frontier, last-touched level, saved sandbox designs, theme preference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor reaches an editable canvas of the first challenge
  within 3 clicks and under 30 seconds of landing, without instructions.
- **SC-002**: Dragging, connecting, and mission check-offs respond within 100 ms as
  perceived by the user; canvas manipulation stays visibly smooth (no stutter) on
  designs of 50 nodes.
- **SC-003**: Pressing RUN returns the full five-dimension score and feedback in under
  5 seconds in every case.
- **SC-004**: A newcomer can complete the first level (read brief, build, pass ≥ 90)
  in under 15 minutes without external help.
- **SC-005**: After a forced browser restart mid-edit, resuming restores the design
  with at most a few seconds of lost edits, 100% of the time.
- **SC-006**: Mission auto-verification agrees with a manual reading of the checklist
  rules in 100% of seeded-level test cases (no false checks or misses).
- **SC-007**: The initial release ships at least the first two Acts (≥ 12 playable
  levels) end-to-end: brief, missions, hints, scoring, and unlock chain all working.

## Assumptions

- **Single user, no accounts**: This is a personal website. There is no sign-in,
  multi-user support, leaderboard, or sharing; progress belongs to the one user of the
  deployment.
- **Descoped from the original reference**: payments/pricing/premium tiers, a credits
  economy (hints and any AI assistance are free), blogs/wiki/guides content, marketing
  homepage, bounty/quest events, streaks, daily goals, activity heatmap, chaos-mode
  ("Murphy's Lab"), and the five non-HLD labs (Schema, API, GenAI, Python, and a
  separate MYD product) are all out of scope. The sandbox (Story 5) covers the
  free-form design need.
- **Evaluation approach**: Scoring is deterministic and rule-based at launch (missions,
  graph-flow checks, topology rules, budget/latency arithmetic, redundancy checks).
  Richer AI-generated narrative feedback may be layered on later without changing the
  five-dimension contract; the 5-second result budget still applies.
- **Content depth**: The level structure supports the full 70-level, 9-Act catalog, but
  initial content is seeded incrementally starting with the first two Acts (SC-007).
  Example levels (Static App, 3-Tier Web App, URL Shortener, Rate Limiter, …) set the
  tone for seed content.
- **Desktop-first**: The playground targets desktop and tablet viewports; small-screen
  phone support may degrade gracefully.
- **Reference experience**: scaledojo.dev is the interaction-quality benchmark for the
  playground, per the project constitution.
