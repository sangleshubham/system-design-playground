<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.0.1 (PATCH: pinned Express as the Node.js backend
framework, resolving the decision previously deferred to the first plan)
Previous: [template] → 1.0.0 (initial ratification)
Modified principles: n/a (all placeholders filled for the first time)
Added sections:
  - Core Principles (5): Interactivity-First, Simplicity & Ease of Use,
    Fixed Technology Stack, Modular Component Architecture, Performance &
    Responsiveness
  - Technology Stack & Constraints
  - Development Workflow & Quality Gates
  - Governance
Removed sections: none (template comments removed after replacement)
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ compatible (Constitution Check gate
    reads gates from this file; Technical Context fields cover stack/perf)
  - .specify/templates/spec-template.md ✅ compatible (Success Criteria section
    supports measurable UX outcomes required by Principles I & II)
  - .specify/templates/tasks-template.md ✅ compatible (phase/user-story
    organization supports incremental interactive-module delivery)
  - .specify/templates/commands/*.md ⚠ not present (no commands directory)
Follow-up TODOs: none
-->

# System Design Interactive Constitution

## Core Principles

### I. Interactivity-First

Every learning feature MUST be interactive, not passive. Content pages MUST include at
least one hands-on element the learner manipulates — such as draggable architecture
diagrams, step-through simulations, quizzes, or live parameter controls that visibly
change system behavior. Static, read-only walls of text are prohibited as the primary
teaching mechanism; prose exists to support the interaction, not replace it.

**Rationale**: The product's core differentiator (modeled on scaledojo.dev) is learning
system design by doing. If a feature can ship without interaction, it belongs in a blog,
not this product.

### II. Simplicity & Ease of Use

The interface MUST be usable without instruction. Every user-facing flow MUST satisfy:
a first-time visitor reaches their first interactive exercise in 3 clicks or fewer from
the dashboard; every interactive control provides immediate visual feedback (< 100 ms
perceived response); navigation, terminology, and visual language stay consistent across
all modules. Features that require a manual or tooltip-chain to understand MUST be
redesigned before release.

**Rationale**: Learners arrive to study system design, not to learn the website. Any
friction in the UI directly competes with the cognitive load of the material itself.

### III. Fixed Technology Stack (NON-NEGOTIABLE)

The frontend MUST be built with Angular (current LTS major version) and TypeScript. The
backend MUST be built with Node.js. New runtime frameworks, alternative frontend
libraries (React, Vue, etc.), or backend platforms MUST NOT be introduced. Third-party
libraries are permitted only when they integrate within this stack (e.g., Angular-
compatible visualization libraries, Node.js middleware) and each addition MUST be
justified in the implementation plan.

**Rationale**: A single, declared stack keeps the codebase learnable, keeps hiring and
tooling decisions simple, and prevents framework sprawl in a project maintained by a
small team.

### IV. Modular Component Architecture

Interactive learning modules MUST be self-contained Angular feature modules or
standalone components with clearly defined inputs/outputs, lazily loaded per route.
Backend capabilities MUST be exposed as versioned REST endpoints under `/api/`, with
request/response contracts documented before implementation. Shared UI elements
(diagram canvas, quiz engine, progress tracker) MUST live in a shared library consumed
by feature modules — never copy-pasted between them.

**Rationale**: The site grows one learning module at a time. Isolation lets each module
be built, tested, and shipped independently without regressions across the catalog.

### V. Performance & Responsiveness

Interactive elements MUST remain smooth on mid-range hardware: animations and diagram
manipulation MUST target 60 fps; initial dashboard load MUST complete in under 3 seconds
on a standard broadband connection; route-level code splitting and lazy loading are
mandatory for every learning module. The site MUST be responsive and fully functional on
desktop and tablet viewports (≥ 768 px); mobile support SHOULD degrade gracefully rather
than break.

**Rationale**: Sluggish interaction destroys the hands-on learning experience that
Principle I mandates — performance is a feature requirement, not an optimization pass.

## Technology Stack & Constraints

- **Frontend**: Angular (LTS) + TypeScript, Angular CLI for scaffolding and builds.
- **Backend**: Node.js with Express. Express is the mandated HTTP framework;
  alternative Node.js frameworks (NestJS, Fastify, Koa, etc.) MUST NOT be
  introduced. TypeScript SHOULD be used on the backend for consistency with the
  Angular frontend.
- **API style**: JSON over REST under `/api/v1/`; breaking API changes require a new
  version prefix.
- **Repository layout**: web application structure — `frontend/` and `backend/` at the
  repository root, each with its own `src/` and `tests/`.
- **Reference experience**: https://scaledojo.dev/dashboard is the benchmark for
  interaction quality and dashboard layout; feature specs SHOULD cite which aspect of
  that experience they parallel or improve upon.

## Development Workflow & Quality Gates

- Every feature follows the Spec Kit flow: specification → plan (with Constitution
  Check gate) → tasks → implementation. The Constitution Check in each plan MUST
  explicitly confirm Principles I–V or record a justified violation in Complexity
  Tracking.
- Each user story MUST be independently testable and demonstrable in the browser
  before the next story begins.
- Code MUST pass linting (ESLint) and formatting checks before merge; interactive
  components MUST include at least a smoke test verifying they render and respond to
  a primary user action.
- UX review against Principle II (3-click rule, feedback latency, consistency) is a
  release gate for every user-facing feature.

## Governance

This constitution supersedes all other development practices in this repository. All
plans, specs, and reviews MUST verify compliance with it; any violation MUST be either
resolved or explicitly justified in the plan's Complexity Tracking table.

**Amendment procedure**: Amendments are proposed as edits to this file, accompanied by
a Sync Impact Report and updates to any dependent templates. The project owner approves
amendments; approval is recorded by committing the updated file.

**Versioning policy**: Semantic versioning — MAJOR for removed or redefined principles
and other backward-incompatible governance changes; MINOR for new principles or
materially expanded guidance; PATCH for clarifications and wording fixes.

**Compliance review**: The `/speckit-plan` Constitution Check gate is the enforcement
point for every feature. Reviews of completed work re-check the gate before merge.

**Version**: 1.0.1 | **Ratified**: 2026-07-08 | **Last Amended**: 2026-07-08
