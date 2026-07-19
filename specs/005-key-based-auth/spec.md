# Feature Specification: Key-Based Authentication & Design Sharing

**Feature Branch**: `005-key-based-auth`

**Created**: 2026-07-18

**Status**: Draft

**Input**: User description: "I want to build a unique authetication system for this project. 1. The authetication will happen based on key. My initial thought is that we will use SHA-256 key which will be generated for users. 2. When user opens the site, We will ether generate a key for them or ask them to enter a key or check if a keys is already stored in his local browser storage. 3. If people want to share their designs, they can share their key and others can use it to open the design. 4. Need to think what will happen if the same key is used by multiple users at a same time. That might break the backend. 5. IMP: If we can create a small sized key which can be easily shared but not guessed."

## Clarifications

### Session 2026-07-18

- Q: What can someone holding a shared key do with the designs under it? → A: Full access — anyone holding the key is an equal owner (view, edit, delete); single-key model with no roles.
- Q: How do concurrent edits to the same design resolve? → A: Last-write-wins — the most recent save becomes the current version, and a user saving over a version that changed since they loaded it is warned before overwriting.
- Q: What user data does an access key own (travels with it, shared with it)? → A: Everything user-specific — sandbox designs, level designs, attempts, learner progress, and AI review history. The key is the complete profile.
- Q: What does a first-time visitor (no stored key) see on opening the site? → A: A choice screen before the playground: "create a new key" or "I have a key" — no silent auto-generation, no key-less exploration.
- Q: How is a shared key redeemed — typed into the site, or also via a direct URL embedding the key? → A: Manual entry only. Keys never appear in URLs, so they cannot leak through browser history, server logs, or referrer headers; link-based sharing is out of scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant workspace on first visit (Priority: P1)

A first-time visitor opens the site. Because their browser holds no access key, they are offered two choices: create a new key or enter one they already have. Choosing "create" instantly issues a short, unguessable access key, shows it once with a clear "save this — it is the only way back to your designs" message, and takes them straight into the playground. The browser remembers the key, so every later visit on that browser goes directly to their workspace with no sign-in step.

**Why this priority**: This is the entry point for every other capability — without a key there is no ownership, no cross-device access, and no sharing. It must also preserve the product's frictionless feel: a first-time visitor still reaches their first interactive exercise in 3 clicks or fewer.

**Independent Test**: Start with a browser that has never visited the site, open the site, create a key, save a design, close and reopen the browser, and confirm the same workspace loads without any prompt.

**Acceptance Scenarios**:

1. **Given** a visitor whose browser holds no key, **When** they open the site, **Then** they are offered both "create a new key" and "use an existing key" before entering the playground.
2. **Given** the visitor chooses to create a key, **When** the key is issued, **Then** it is displayed with a one-click copy control and a warning that losing the key means permanently losing access to the designs saved under it.
3. **Given** a visitor whose browser already holds a valid key, **When** they open the site, **Then** they arrive in their workspace with no key prompt.
4. **Given** a visitor with an active key, **When** they save a design, **Then** that design is associated with their key.

---

### User Story 2 - Pick up work on any device (Priority: P2)

A returning user sits down at a different computer (or a browser whose stored data was cleared), chooses "use an existing key", types in their short key, and immediately gets their complete profile back: every saved design plus their level progress, attempts, and AI review history. On a shared machine they can also tell the site to forget the key so the next person does not inherit their workspace.

**Why this priority**: The key is only an identity if it travels — cross-device access is what turns a locally remembered token into portable authentication.

**Independent Test**: Save designs under a key in one browser; open a second browser (or private window), enter the key, and confirm all designs appear; then forget the key and confirm the next visit asks for a key again.

**Acceptance Scenarios**:

1. **Given** designs, attempts, and progress saved under a key, **When** that key is entered on another device, **Then** the full workspace — designs, level progress, attempts, and AI review history — is available.
2. **Given** a mistyped or never-issued key, **When** it is submitted, **Then** entry is refused with a clear error message and no empty workspace is silently created.
3. **Given** an active session, **When** the user chooses to forget the key on this device, **Then** the next visit on that browser prompts for a key again while the designs remain safe on the server.
4. **Given** many rapid invalid key submissions from the same source, **When** the allowed limit is exceeded, **Then** further attempts are temporarily refused.

---

### User Story 3 - Share designs by sharing the key (Priority: P3)

A user wants a teammate to see their designs. They send the short key in a chat message (or read it aloud); the teammate enters it on their own machine and opens the shared designs.

**Why this priority**: Sharing is the stated motivation for the key model, but it only becomes possible once Stories 1 and 2 exist. It delivers the collaborative value on top of them.

**Independent Test**: Create designs under a key on machine A, relay the key to a second person on machine B, and confirm they can open the designs.

**Acceptance Scenarios**:

1. **Given** user A's key with saved designs, **When** user B enters that key on a different device, **Then** user B can open those designs.
2. **Given** a generated key, **When** it is relayed in a single short chat message or read aloud, **Then** the recipient can type it accurately on the first attempt.
3. **Given** user B has opened designs via a shared key, **When** they edit or delete a design, **Then** the change succeeds — anyone holding the key has the same full access as the person who created it.

---

### User Story 4 - Two people, one key, nothing breaks (Priority: P3)

Two people are using the same key at the same time — the owner and someone they shared it with, or the owner on two of their own devices. Both browse and edit; the service stays stable and nobody's saved work is silently destroyed.

**Why this priority**: Simultaneous use is the direct consequence of key sharing and the main stability risk the feature introduces. It protects the value delivered by Story 3.

**Independent Test**: Open the same key in two browsers, perform saves from both, and confirm the service stays responsive and every design remains intact and loadable afterwards.

**Acceptance Scenarios**:

1. **Given** the same key active in two browsers, **When** both users browse and open designs simultaneously, **Then** both receive normal, error-free service.
2. **Given** the same key active in two browsers, **When** both users edit and save the same design, **Then** the most recent save becomes the current version and the design is never corrupted or partially saved.
3. **Given** a design that changed on the server after a user opened it, **When** that user saves, **Then** they are warned that they are about to overwrite newer changes before the save is applied.

---

### Edge Cases

- Browser data cleared or private-browsing window closed: the visitor is treated as new; their designs remain safe and reachable by re-entering the key.
- Key lost with no copy saved: the workspace is permanently inaccessible — an accepted trade-off that the creation screen explicitly warns about.
- The same key open in two tabs of the same browser: treated the same as two devices (Story 4).
- Backend unreachable while validating an entered key: the user sees a clear, retryable error and does not have to retype the key.
- A key is created but no design is ever saved: an empty workspace is valid and simply loads empty.
- Automated guessing of keys at high volume: throttling makes discovery of any valid key statistically infeasible (see SC-004).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On arrival, the system MUST detect whether the browser already holds an access key and route key-holders straight into their workspace with no prompt.
- **FR-002**: Visitors without a stored key MUST be offered both options before entering the playground: generate a new key, or enter an existing one.
- **FR-003**: The system MUST generate access keys that are globally unique, short enough to relay in a single chat message or read aloud (at most 14 characters), and drawn from a space large enough that guessing any active key is statistically infeasible.
- **FR-004**: A newly generated key MUST be presented with a one-click copy control and an explicit warning that the key is the only way to access the designs saved under it and cannot be recovered.
- **FR-005**: The browser MUST remember the active key so later visits need no re-entry, and the user MUST be able to make the browser forget it (switch key / sign out) without affecting the stored designs.
- **FR-006**: Entering a valid key on any device MUST load the full workspace associated with that key — sandbox designs, level designs, attempts, learner progress, and AI review history.
- **FR-007**: Entering a key that was never issued MUST be rejected with a clear error; it MUST NOT silently create a new empty workspace.
- **FR-008**: The system MUST limit the rate of failed key-entry attempts so that brute-force guessing is impractical.
- **FR-009**: All user-specific data created while a key is active — saved designs, level attempts, learner progress, and AI review history — MUST be associated with that key, and a key once issued MUST remain valid indefinitely.
- **FR-010**: Anyone who enters a shared key MUST receive the same full access as the key's creator — viewing, editing, and deleting any design under it, and the same visibility into the workspace's progress, attempts, and AI review history. There are no roles or permission levels; the key is the workspace.
- **FR-011**: The system MUST remain fully available and MUST NOT corrupt or lose saved designs when the same key is in use from multiple devices simultaneously. Concurrent edits to the same design MUST resolve as last-write-wins: the most recent save becomes the current version, and a user saving over a version that has changed since they loaded it MUST be warned before the overwrite is applied.
- **FR-012**: Keys MUST be redeemed only through the in-app key entry field. The system MUST NOT place access keys in page URLs or accept them from URLs, so keys cannot leak through browser history, server logs, or referrer headers.

### Key Entities

- **Access Key**: a short, unguessable code that is simultaneously a user's identity and their proof of access; each key owns exactly one workspace. It is the only credential in the system — no emails, passwords, or profiles.
- **Workspace**: all user-specific data associated with one access key — sandbox designs, per-level designs, attempts, learner progress, and AI review history.
- **Design**: an existing saved system-design diagram (from the playground feature); gains an owning access key.
- **Device Session**: the remembered key on a particular browser; forgetting it detaches the device without deleting the workspace.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor reaches a working playground with a newly created key in 3 clicks or fewer and under 30 seconds.
- **SC-002**: A returning visitor on a browser with a remembered key reaches their workspace with zero authentication steps.
- **SC-003**: Access keys are at most 14 characters long and can be relayed accurately in a single short message or read aloud.
- **SC-004**: An attacker submitting key guesses continuously at the maximum rate the system allows has less than a 0.001% chance of discovering any valid key within one year.
- **SC-005**: 100% of designs saved before or during concurrent same-key use remain intact and loadable afterwards — no corruption, no partial saves.
- **SC-006**: A user entering their key on a new device sees their complete design list within 3 seconds.

## Assumptions

- The key is the only credential: no emails, passwords, or personal data are collected. Consequently a lost key cannot be recovered, and the designs under it become permanently inaccessible; the key-creation screen warns about this explicitly.
- Keys never expire and there is no practical limit on the number of designs per key.
- "SHA-256" in the feature request is treated as an implementation suggestion, not a requirement. The spec requires only that keys be small and unguessable; the generation mechanism is decided during planning. (Noted for the plan: a raw SHA-256 hex string is 64 characters, which would conflict with the 14-character shareability requirement.)
- Only server-issued keys are valid; users cannot invent their own keys (this is what makes rejecting unknown keys possible and guessing meaningful to defend against).
- There is no production user data today, so no migration of pre-existing designs to key ownership is needed; any development data may be reset.
- Rate limiting plus a sufficiently large key space is an acceptable defense; no additional factors (passwords, email verification, CAPTCHA) are in scope for this feature.
- Sharing is all-or-nothing and irrevocable: giving someone the key gives them permanent full access to the workspace (decided in clarification). Users who want to retain sole control simply do not share their key; view-only or per-design sharing is out of scope for this feature.
- Link-based sharing (a URL that embeds the key) is out of scope; if wanted later it becomes its own feature with its own leak-mitigation design.
