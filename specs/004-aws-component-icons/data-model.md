# Data Model: AWS Component Icons

**Feature**: 004-aws-component-icons | **Date**: 2026-07-11

No new persisted entities and no state transitions. The feature changes the *vocabulary* of
one existing field and adds two in-code registries. Authoritative mapping source:
[spec.md § Component Icon Mapping](./spec.md); design decisions: [research.md](./research.md).

## 1. Component (existing entity — field semantics change)

Defined in `backend/src/models/index.ts` (Zod) and hand-mirrored in
`frontend/src/app/core/models.ts` (see mirror convention note in that file's header).

| Field | Before | After |
|---|---|---|
| `icon` | `z.string().min(1)` — held one of the 7 category names; palette/canvas resolved it to a generic stroke glyph | `z.enum(COMPONENT_ICON_IDS)` — holds one of exactly 42 component-icon ids (below); resolved through the merged icon registry |

All other fields (`id`, `name`, `tech`, `category`, `description`, `costPerHr`, `latencyMs`)
are untouched (FR-010). The frontend mirror keeps `icon: string` (the enum lives backend-side
where content is validated; the frontend's safety net is the fallback resolver, not a type).

**Validation rules**:
- Startup: `ContentService` parses `components.json` against the updated schema — an unknown
  icon id fails fast with the existing per-file `ContentError` (FR-007).
- Uniqueness: no two components may share an icon id — enforced by a registry unit test
  (FR-005) because the mapping is 1:1 by construction (each id appears exactly once below).

## 2. COMPONENT_ICON_IDS (new backend constant — the 42-value vocabulary)

`aws-*` ids name the AWS service whose official icon is shown; `tile-*` ids name the
component (glyph choice stays registry-internal, research R6). Tile colors for `tile-*`
entries are fixed by the spec's mapping table.

### AWS-mapped (23)

| Component id | `icon` value | Source file (in `Architecture-Service-Icons_04302026/`) |
|---|---|---|
| `dns` | `aws-route-53` | `Arch_Networking-Content-Delivery/48/Arch_Amazon-Route-53_48.svg` |
| `cdn` | `aws-cloudfront` | `Arch_Networking-Content-Delivery/48/Arch_Amazon-CloudFront_48.svg` |
| `load-balancer` | `aws-elastic-load-balancing` | `Arch_Networking-Content-Delivery/48/Arch_Elastic-Load-Balancing_48.svg` |
| `api-gateway` | `aws-api-gateway` | `Arch_Networking-Content-Delivery/48/Arch_Amazon-API-Gateway_48.svg` |
| `waf` | `aws-waf` | `Arch_Security-Identity/48/Arch_AWS-WAF_48.svg` |
| `web-server` | `aws-ec2` | `Arch_Compute/48/Arch_Amazon-EC2_48.svg` |
| `worker` | `aws-lambda` | `Arch_Compute/48/Arch_AWS-Lambda_48.svg` |
| `stream-processor` | `aws-managed-flink` | `Arch_Analytics/48/Arch_Amazon-Managed-Service-for-Apache-Flink_48.svg` |
| `task-scheduler` | `aws-mwaa` | `Arch_Application-Integration/48/Arch_Amazon-Managed-Workflows-for-Apache-Airflow_48.svg` |
| `embedding-service` | `aws-sagemaker-ai` | `Arch_Artificial-Intelligence/48/Arch_Amazon-SageMaker-AI_48.svg` |
| `llm-inference` | `aws-bedrock` | `Arch_Artificial-Intelligence/48/Arch_Amazon-Bedrock_48.svg` |
| `sql-database` | `aws-rds` | `Arch_Databases/48/Arch_Amazon-RDS_48.svg` |
| `nosql-database` | `aws-dynamodb` | `Arch_Databases/48/Arch_Amazon-DynamoDB_48.svg` |
| `blob-storage` | `aws-s3` | `Arch_Storage/48/Arch_Amazon-Simple-Storage-Service_48.svg` |
| `search-index` | `aws-opensearch` | `Arch_Analytics/48/Arch_Amazon-OpenSearch-Service_48.svg` |
| `timeseries-db` | `aws-timestream` | `Arch_Databases/48/Arch_Amazon-Timestream_48.svg` |
| `graph-database` | `aws-neptune` | `Arch_Databases/48/Arch_Amazon-Neptune_48.svg` |
| `data-warehouse` | `aws-redshift` | `Arch_Analytics/48/Arch_Amazon-Redshift_48.svg` |
| `cache` | `aws-elasticache` | `Arch_Databases/48/Arch_Amazon-ElastiCache_48.svg` |
| `message-queue` | `aws-sqs` | `Arch_Application-Integration/48/Arch_Amazon-Simple-Queue-Service_48.svg` |
| `pub-sub` | `aws-sns` | `Arch_Application-Integration/48/Arch_Amazon-Simple-Notification-Service_48.svg` |
| `monitoring` | `aws-cloudwatch` | `Arch_Management-Tools/48/Arch_Amazon-CloudWatch_48.svg` |
| `service-registry` | `aws-cloud-map` | `Arch_Networking-Content-Delivery/48/Arch_AWS-Cloud-Map_48.svg` |

### Companion-mapped (19)

| Component id | `icon` value | Tile fill | Indicative Lucide glyph |
|---|---|---|---|
| `client` | `tile-client` | `#232F3E` | monitor-smartphone |
| `rate-limiter` | `tile-rate-limiter` | `#8C4FFF` | gauge |
| `reverse-proxy` | `tile-reverse-proxy` | `#8C4FFF` | waypoints |
| `prompt-router` | `tile-prompt-router` | `#01A88D` | route |
| `websocket-server` | `tile-websocket-server` | `#E7157B` | cable |
| `chunking-service` | `tile-chunking-service` | `#01A88D` | scissors |
| `reranker` | `tile-reranker` | `#01A88D` | list-ordered |
| `vector-database` | `tile-vector-database` | `#C925D1` | chart-scatter |
| `context-store` | `tile-context-store` | `#C925D1` | layers |
| `bloom-filter` | `tile-bloom-filter` | `#C925D1` | filter |
| `dead-letter-queue` | `tile-dead-letter-queue` | `#E7157B` | mail-warning |
| `notification-service` | `tile-notification-service` | `#E7157B` | bell-ring |
| `payment-service` | `tile-payment-service` | `#232F3E` | credit-card |
| `zookeeper-etcd` | `tile-zookeeper-etcd` | `#E7157B` | network |
| `circuit-breaker` | `tile-circuit-breaker` | `#E7157B` | zap-off |
| `log-aggregator` | `tile-log-aggregator` | `#E7157B` | scroll-text |
| `guardrail-service` | `tile-guardrail-service` | `#01A88D` | shield-check |
| `llm-observability` | `tile-llm-observability` | `#01A88D` | activity |
| `model-registry` | `tile-model-registry` | `#01A88D` | package |

## 3. COMPONENT_ICONS (new frontend registry map)

`frontend/src/app/shared/component-icon.registry.ts` —
`Record<string, string>` of complete `<svg>` strings, spread into the existing `ICONS` map.

| Entry class | Count | Construction |
|---|---|---|
| AWS icons (`aws-*`) | 23 | Generated from package files by `frontend/tools/generate-component-icons.mjs` (cleanup rules: research R3) |
| Companion tiles (`tile-*`) | 19 | `tile(fill, glyph24)` composer (research R5), colors per § 2 |
| Fallback tiles (`fallback-<category>`) | 7 | `tile('#232F3E', <existing category stroke glyph>)` — runtime-only; **not** valid content values (excluded from `COMPONENT_ICON_IDS`) |

**Invariants** (asserted by `component-icon.registry.spec.ts`):
1. Every id in the § 2 vocabulary resolves to a non-empty SVG string (completeness, FR-001).
2. All 42 component SVG strings are pairwise distinct (uniqueness, FR-005).
3. Every `fallback-<category>` exists for all 7 categories (FR-007).
4. No key collides with a UI-glyph key in `icon.registry.ts` (namespace safety).

## 4. componentIconName (new pure resolver)

```
componentIconName(icon: string, category: Category): string
  → icon                    if icon ∈ merged ICONS
  → `fallback-${category}`  otherwise
```

Used by both render surfaces (palette entry, design node) so fallback behavior is identical
everywhere (FR-007). Replaces the design node's current `component()?.icon ?? category()`
expression.

## 5. Relationships

```
components.json (42 entries)
  └── icon: COMPONENT_ICON_IDS (backend z.enum — startup gate)
        └── resolved by componentIconName() (frontend)
              ├── COMPONENT_ICONS[icon]              (42 entries: 23 aws-* + 19 tile-*)
              └── COMPONENT_ICONS[fallback-<category>] (7 entries, unknown-id safety net)
```
