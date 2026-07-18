# Feature Specification: AWS Component Icons

**Feature Branch**: `004-aws-component-icons`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "I want to integrate AWS icons for components. Use context7 to read the icon documentation. Icon Link: https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/architecture/approved/architecture-icons/Icon-package_04302026.4705b90f5aa45b019271a2699e9ce9b97b941ee1.zip"

**Clarifications resolved with user (2026-07-11)**:

1. **Coverage** — AWS icons only for components with a genuine AWS equivalent; the rest use a well-chosen companion icon library (researched via context7: Lucide selected).
2. **Set behavior** — Replace the current minimalist icons outright; no user-facing icon-theme toggle.
3. **Icon style** — AWS "Service" icons (full-color category-colored tiles). Companion icons are unified with them: white glyph on a rounded square tile in a saturated AWS-palette color (see Clarifications, Session 2026-07-11), same dimensions as the AWS tiles.
4. **Match rule** — Concept-level matching: a component gets an AWS icon whenever AWS offers a service for that *concept* (e.g., Data Warehouse → Amazon Redshift even though its tech label says "Snowflake").

## Clarifications

### Session 2026-07-11

- Q: How should the 19 companion (Lucide) tiles be colored, given that the app's existing category colors are light pastels (a white glyph would be unreadable on them) and AWS tiles use a saturated brand palette that does not follow the app's 7 categories? → A: AWS palette harmony — each companion tile uses the saturated AWS category color of the concept's nearest AWS home category (white glyph); the Component Icon Mapping table carries an explicit tile-color column. The app's pastel category tokens remain in use elsewhere (palette section styling, node cards) but no longer drive icon tile fills.
- Q: Confirm the four judgment-call AWS mappings — Worker → AWS Lambda, Task Scheduler → Amazon Managed Workflows for Apache Airflow, Embedding Service → Amazon SageMaker AI, NoSQL Database → Amazon DynamoDB? → A: All four confirmed as specced; the Component Icon Mapping table is final for the AWS/companion split and AWS service assignments.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recognize Real AWS Services on the Canvas (Priority: P1)

As a learner building a system design, when I browse the component palette or look at nodes on my canvas, components that correspond to real AWS services display their official AWS architecture icon — so my design reads like a real-world AWS architecture diagram and I build recognition of the icons used in professional diagrams, interviews, and AWS documentation.

**Why this priority**: This is the core value of the feature — connecting abstract system-design concepts (e.g., "Blob Storage") to the concrete, industry-standard iconography practitioners actually use (Amazon S3's icon). Without it, nothing else in this feature matters.

**Independent Test**: Can be fully tested by opening the playground and verifying that each of the 23 AWS-mapped components (see Component Icon Mapping) shows its official AWS icon in the palette and as a canvas node after being dragged on.

**Acceptance Scenarios**:

1. **Given** the component palette is loaded, **When** the learner locates "Blob Storage", **Then** its palette entry displays the official Amazon S3 architecture icon (full-color tile).
2. **Given** the learner drags "DNS" onto the canvas, **When** the node renders, **Then** it displays the official Amazon Route 53 architecture icon.
3. **Given** any of the 23 AWS-mapped components, **When** it is rendered on any surface, **Then** the icon is the official, unmodified AWS icon from the current icon release — not recolored, redrawn, distorted, or rotated.

---

### User Story 2 - One Coherent Visual Language for Every Component (Priority: P2)

As a learner, when I see components that have no AWS equivalent (e.g., Bloom Filter, Circuit Breaker, ZooKeeper/etcd), they appear in the same visual style as the AWS-mapped ones — a colored tile with a clear glyph — so the palette and canvas feel like one designed system, not a mix of two icon sets.

**Why this priority**: Visual coherence is what makes the replacement feel professional rather than half-finished; it directly addresses the main risk of mixing two icon sources.

**Independent Test**: Can be tested by viewing the full palette and a canvas containing both AWS-mapped and companion-mapped nodes side by side, and confirming uniform tile size, shape, and treatment.

**Acceptance Scenarios**:

1. **Given** the palette is loaded, **When** the learner views "Bloom Filter", **Then** it displays a white glyph centered on a rounded square tile filled with its assigned AWS-palette color (Database magenta `#C925D1`, the home category of caching services like ElastiCache), with the same dimensions as AWS icon tiles.
2. **Given** a canvas containing a "Blob Storage" node (AWS icon) next to a "Circuit Breaker" node (companion icon), **When** the learner views them, **Then** both render as equally sized tiles with visually consistent weight and corner treatment.
3. **Given** the full catalog of 42 components, **When** all icons are compared, **Then** no two components share an identical icon.

---

### User Story 3 - Complete and Safe Replacement (Priority: P3)

As a learner, everywhere a component appears in the app I see only the new icons — the old generic category icons are fully retired for components — and if an icon ever fails to resolve, I see a sensible placeholder rather than a blank space.

**Why this priority**: Guarantees the change is complete (no stale visuals) and robust (graceful degradation), but only matters once stories 1 and 2 exist.

**Acceptance Scenarios**:

1. **Given** any screen of the app, **When** a catalog component is visually represented, **Then** the legacy generic category icon no longer appears for it; non-component interface glyphs (search, play, lock, check, note, etc.) are unchanged.
2. **Given** a component whose icon identifier cannot be resolved, **When** it renders, **Then** it falls back to a rounded tile in AWS dark navy (`#232F3E`) bearing a white category glyph — never an empty or broken image — and the problem is reported by the existing content validation at startup.
3. **Given** the learner zooms the canvas out or in, **When** nodes render at smaller or larger sizes, **Then** icons remain crisp and legible (no pixelation).

---

### Edge Cases

- **Unknown icon identifier** in the component catalog (typo, future component added without a mapping): startup content validation must reject/report it, and rendering must fall back to the dark-navy fallback tile (never blank).
- **Two components accidentally assigned the same icon**: forbidden by requirement FR-005; the mapping table below is the single source of truth.
- **Small render sizes**: at the smallest size icons are shown (palette entry), the tile and glyph must remain distinguishable; AWS provides the same artwork in multiple sizes, all vector.
- **Theme/background changes**: AWS tiles have fixed brand colors that do not adapt to the app theme; component surfaces (palette rows, node cards) must keep sufficient contrast behind them in every theme the app supports.
- **Icon release updates**: AWS refreshes its icon package periodically (this spec pins the 2026-04-30 release); a future refresh must be a data/asset swap, not a redesign.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every one of the 42 catalog components MUST display its assigned component-specific icon (per the Component Icon Mapping below) on every surface where a component is visually represented — today the component palette and canvas design nodes.
- **FR-002**: The 23 components with a concept-level AWS equivalent MUST display the official AWS Architecture "Service" icon (full-color tile) of the mapped service, taken from the AWS Architecture Icons release dated 2026-04-30 (package supplied by the user).
- **FR-003**: The remaining 19 components MUST display a companion glyph (Lucide icon set) rendered as a white glyph centered on a rounded square tile filled with the saturated AWS category color assigned in the Component Icon Mapping table (the AWS home category of the component's concept), dimensionally identical to the AWS tiles.
- **FR-004**: The legacy generic category icons MUST no longer be used for any catalog component (outright replacement — no icon-theme toggle). Non-component interface glyphs are out of scope and unchanged.
- **FR-005**: No two components may share an identical icon; every component's icon MUST be visually unique across the catalog.
- **FR-006**: Official AWS icons MUST be used as supplied — no recoloring, redrawing, distortion, rotation, or cropping — consistent with AWS's published usage guidance for its architecture icons.
- **FR-007**: If an icon asset cannot be resolved at runtime, the component MUST fall back to a rounded tile in AWS dark navy (`#232F3E`) bearing a white category glyph (never render empty), and startup content validation MUST report unknown icon identifiers.
- **FR-008**: Icons MUST render crisply at every size the app displays them (palette entry through zoomed-in canvas node), i.e., from scalable vector artwork.
- **FR-009**: All icon assets MUST ship with the application; rendering MUST NOT depend on fetching icons from external services at runtime.
- **FR-010**: The change is visual only: component names, tech labels, descriptions, costs, latencies, categories, missions, scoring, and validation behavior MUST be unaffected.

### Component Icon Mapping

Concept-level mapping agreed with the user. AWS assignments are authoritative; Lucide glyph names are indicative and may be fine-tuned during planning **without** changing which components use companion icons.

**AWS-mapped components (23)** — official AWS Service icon:

| Component | AWS Service icon |
|---|---|
| DNS | Amazon Route 53 |
| CDN | Amazon CloudFront |
| Load Balancer | Elastic Load Balancing |
| API Gateway | Amazon API Gateway |
| Web Application Firewall | AWS WAF |
| Web Server | Amazon EC2 |
| Worker | AWS Lambda |
| Stream Processor | Amazon Managed Service for Apache Flink |
| Task Scheduler | Amazon Managed Workflows for Apache Airflow |
| Embedding Service | Amazon SageMaker AI |
| LLM Inference | Amazon Bedrock |
| SQL Database | Amazon RDS |
| NoSQL Database | Amazon DynamoDB |
| Blob Storage | Amazon S3 |
| Search Index | Amazon OpenSearch Service |
| Time-Series DB | Amazon Timestream |
| Graph Database | Amazon Neptune |
| Data Warehouse | Amazon Redshift |
| Cache | Amazon ElastiCache |
| Message Queue | Amazon SQS |
| Pub/Sub | Amazon SNS |
| Monitoring & Alerting | Amazon CloudWatch |
| Service Registry | AWS Cloud Map |

**Companion-mapped components (19)** — white Lucide glyph on a tile filled with the saturated AWS category color of the concept's nearest AWS home category (colors extracted from the pinned icon release):

| Component | Tile color (AWS palette) | Indicative glyph | Why not an AWS icon |
|---|---|---|---|
| Client | Dark navy `#232F3E` (General) | monitor-smartphone | End-user device, not an AWS service |
| Rate Limiter | Networking purple `#8C4FFF` | gauge | Throttling is a feature, not a service |
| Reverse Proxy | Networking purple `#8C4FFF` | waypoints | No dedicated AWS service |
| Prompt Router | AI teal `#01A88D` | route | No AWS service icon for this concept |
| WebSocket Server | App-Integration pink `#E7157B` | cable | AWS answer is API Gateway (WebSocket) — would duplicate the API Gateway icon |
| Chunking Service | AI teal `#01A88D` | scissors | No AWS service |
| Reranker | AI teal `#01A88D` | list-ordered | No AWS service icon |
| Vector Database | Database magenta `#C925D1` | chart-scatter | AWS answer is OpenSearch vector engine — would duplicate Search Index |
| Context Store | Database magenta `#C925D1` | layers | AWS answers (ElastiCache/DynamoDB) would duplicate Cache/NoSQL |
| Bloom Filter | Database magenta `#C925D1` | filter | Data structure, not a service |
| Dead Letter Queue | App-Integration pink `#E7157B` | mail-warning | DLQ is an SQS feature — would duplicate Message Queue |
| Notification Service | App-Integration pink `#E7157B` | bell-ring | Amazon Pinpoint reaches AWS end-of-support Oct 2026; SNS would duplicate Pub/Sub |
| Payment Service | Dark navy `#232F3E` (no AWS home) | credit-card | No AWS payment-processing service |
| ZooKeeper / etcd | Management pink `#E7157B` | network | No public AWS coordination service |
| Circuit Breaker | Management pink `#E7157B` | zap-off | Resilience pattern, not a service |
| Log Aggregator | Management pink `#E7157B` | scroll-text | AWS answer (CloudWatch Logs) would duplicate Monitoring |
| Guardrail Service | AI teal `#01A88D` | shield-check | Bedrock Guardrails would duplicate LLM Inference |
| LLM Observability | AI teal `#01A88D` | activity | No dedicated AWS service icon |
| Model Registry | AI teal `#01A88D` | package | SageMaker feature — would duplicate Embedding Service |

### Key Entities

- **Component** (existing): a catalog entry a learner can place on the canvas. Its icon reference changes meaning — from "name of a generic category glyph" to "identifier of a specific icon asset".
- **Icon Asset**: a scalable vector graphic from one of two sources — the AWS Architecture Icons package (release 2026-04-30) or the Lucide icon set — with a stable identifier, source attribution, and license.
- **Icon Mapping**: the authoritative component → icon-asset assignment defined in this spec; single source of truth for FR-005 uniqueness.
- **Companion Tile**: the visual treatment (rounded square, saturated AWS-palette color fill, white glyph) that unifies companion icons with the AWS tile style; the fallback rendering uses the same treatment in AWS dark navy (`#232F3E`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 42 catalog components display their assigned new icon in both the palette and on canvas nodes; zero legacy generic category icons remain visible on component representations.
- **SC-002**: All 23 AWS-mapped components display the official, unmodified AWS icon from the pinned release — verifiable by side-by-side comparison with the source package.
- **SC-003**: Every component's icon is visually unique — a review of the full palette finds no two identical icons.
- **SC-004**: All 42 component icons render as uniformly sized tiles; a full-palette visual scan reads as a single coherent icon system (no unreconciled style mixing).
- **SC-005**: Playground initial load time increases by no more than 10% compared to before the change.
- **SC-006**: At every zoom level the app supports, a learner can distinguish any two components by icon alone (icons remain legible at the smallest rendered size).

## Assumptions

- The AWS Architecture Icons package downloaded from the user-supplied URL (release dated 2026-04-30) is the authoritative icon source; the "Architecture-Service-Icons" family is the visual basis for AWS-mapped components. AWS's own asset-package documentation (via the awslabs icon tooling docs on context7) confirms the package's Service/Resource/Category/Group structure.
- Lucide (ISC license, ~1,700 icons, 24×24 grid / 2px stroke) is the companion library — chosen with the user; its stroke style matches the app's existing glyph conventions, and glyphs will be rendered white on AWS-palette-colored tiles matching AWS tile dimensions.
- Indicative Lucide glyph choices in the mapping table may be refined during planning; the AWS/companion split itself is fixed by this spec.
- Amazon Pinpoint was deliberately excluded (announced AWS end-of-support: October 2026) — mapping a component to a dying service's icon would bake in obsolescence.
- Component icons currently appear on exactly two surfaces (palette entries and canvas design nodes); any future surface showing components must consume the same mapping.
- Licensing is compatible: AWS provides its architecture icons for building architecture diagrams; Lucide's ISC license permits bundled redistribution. No additional legal review is assumed necessary for this internal learning app.
- Component text (names, tech examples such as "Snowflake" or "Kafka / SQS") stays exactly as-is; only iconography changes. A component may therefore show an AWS icon while its tech label names non-AWS tools — accepted by the user as part of concept-level matching.

## Out of Scope

- A user-facing icon-theme toggle or preference (explicitly rejected in clarification).
- AWS "Resource", "Category", and "Group" icon families (e.g., VPC/region grouping visuals).
- Renaming components to AWS service names or otherwise changing catalog text/data semantics.
- Changes to non-component interface glyphs (search, play, lock, check, note, etc.).
- Icon updates for future AWS icon releases (a later maintenance task; this spec pins release 2026-04-30).
