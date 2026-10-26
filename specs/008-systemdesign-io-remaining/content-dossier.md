# Content dossier — Feature 008

Record of the source pages (fetched 2026-10-26) plus the per-level architecture content
authors MUST encode. Tips are the page's "Here are some details you should know about this
question" bullets (obvious typos fixed; where a page gives a candidate's problem description
or loose notes instead of bullets, the dossier says how they were split). Resource `title` =
the page's label, tidied. No source page has a problem statement or solution of its own —
narratives are authored.

## Authoring rules (apply to every level — same as feature 007)

- Follow the existing level JSON style (`backend/content/levels/level-13.json` is a good
  model): `summary` one sentence; `narrative` 3 paragraphs separated by `\n\n`;
  `objectives` 3–4 chips; `specs` with functional / nonFunctional / constraints / capacity /
  tradeoff / bonus; 3 progressive `hints` (the last one gives away the remaining structure).
- Narrative + specs must state the question's requirements and the back-of-envelope numbers
  given below, and must explain any non-obvious mapping (e.g. "the Client here is the sensor
  fleet", "Blob Storage plays the Haystack photo store").
- `tips` = the bullets below, in order, verbatim. `resources` = the links below, in order,
  with the given `title`, `url` (exact string) and `kind`. `sourceUrl` = the question page.
- `recommendedComponentIds` = every component in the reference design (bonus ones included).
- Missions use only the semantics in `backend/src/services/mission.service.ts`
  (`add` = component present; `connect` = an edge from a node of type A to a node of type B).
  Mission ids `m1..mN` in order; bonus missions last with `"bonus": true`.
- Topology semantics (`backend/src/services/scoring/topology.rule.ts`): `forbidden-edge`
  = no direct edge A→B; `required-between` = no path from any A to any B that avoids every
  `via` node. Resilience: `no-spof` = ≥ 2 nodes of the component; `requires-companion` =
  if the component is present, the companion is present AND directly connected (either
  direction).
- Reference design (tests-only) at `backend/tests/content/solutions/<level-id>.json`
  satisfies every mission (bonus included), topology and resilience rule, and every node
  is reachable from a Client. "×2" = two nodes of that component, each wired identically.
- `specs.budgetPerHr` ≈ 1.2–1.3 × reference cost, rounded up to the nearest 0.5.
  `specs.latencyTargetMs` = the reference critical path as computed by
  `backend/src/services/scoring/efficiency.rule.ts` (longest latency sum over ANY
  Client-rooted path, async branches included) + 10–25 % headroom, rounded to 10 ms. For
  existing levels keep the current budget/target unless the reference needs more.
- Hints must not contradict the topology rules; hints and narrative must not contradict
  the tips or the linked resources. Every hint must be buildable with the palette.
- Plain ASCII apostrophes and quotes in JSON strings; `→`, `≈`, `×`, `—` are fine.

## New components (unit U4)

| id | name | category | costPerHr | latencyMs |
|---|---|---|---|---|
| `auth-service` | Auth Service | services | 0.3 | 30 |
| `feature-flag-service` | Feature Flag Service | services | 0.2 | 3 |
| `ml-model-server` | ML Model Server | compute | 0.9 | 30 |
| `trace-collector` | Trace Collector | services | 0.3 | 5 |
| `external-api` | Third-Party API | services | 0.1 | 150 |
| `batch-processor` | Batch Processor | compute | 1.0 | 300 |

`external-api` = an outside system you call but do not run (weather provider, exchange feed,
retailer site, bank network, OAuth identity provider).

## Acts (each content unit appends its act to `backend/content/acts.json`)

| id | order | title | description |
|---|---|---|---|
| act-5 | 5 | Everyday Products | Weather, parts pickers, wikis, marketplaces, photo libraries, logins and on-call tools — product questions where the data model and APIs matter as much as scale. |
| act-6 | 6 | Live Counts & Presence | Counters, presence and live updates pushed to millions of screens at once. |
| act-7 | 7 | Rides, Ranking & Experiments | Location indexes, ETAs, dynamic prices, experiments and ad auctions driven by streams and models. |
| act-8 | 8 | Money & Flash Sales | Exactly-once inventory and payments: free-food vouchers, room bookings, card charges and wire transfers. |
| act-9 | 9 | Batch & Coordination | Sort, rank, schedule and move data in bulk across fleets of machines. |
| act-10 | 10 | Running Distributed Systems | Downloads, peer-to-peer transfer, health checks, tracing and the control plane that runs a database. |

## Level map (new levels; existing levels 1–24 keep their orders)

| order | id | act | title | difficulty | source Q |
|---|---|---|---|---|---|
| 25 | level-25 | act-5 | Weather App | easy | Q36 |
| 26 | level-26 | act-5 | PC Parts Compatibility | easy | Q54 |
| 27 | level-27 | act-5 | Wiki & Document Versioning | easy | Q37 |
| 28 | level-28 | act-5 | Facebook Marketplace | easy | Q38 |
| 29 | level-29 | act-5 | Photo Sharing (Flickr / Google Photos) | medium | Q45 |
| 30 | level-30 | act-5 | Login & Authentication | medium | Q35 |
| 31 | level-31 | act-5 | On-Call Escalation | medium | Q46 |
| 32 | level-32 | act-6 | Who's Viewing This Page | easy | Q49 |
| 33 | level-33 | act-6 | Facebook Like Counter | medium | Q33 |
| 34 | level-34 | act-6 | Live Like Updates | medium | Q50 |
| 35 | level-35 | act-6 | Live Comments | hard | Q48 |
| 36 | level-36 | act-6 | Live Stock Prices | easy | Q44 |
| 37 | level-37 | act-6 | Price Alerts | easy | Q30 |
| 38 | level-38 | act-6 | Netflix Screen Limit | hard | Q26 |
| 39 | level-39 | act-7 | Find a Driver | hard | Q40 |
| 40 | level-40 | act-7 | ETA & Live Location Sharing | expert | Q27 |
| 41 | level-41 | act-7 | Surge Pricing | expert | Q25 |
| 42 | level-42 | act-7 | A/B Testing Platform | hard | Q29 |
| 43 | level-43 | act-7 | Ads in the Feed | expert | Q55 |
| 44 | level-44 | act-8 | 6 Million Free Burgers | medium | Q42 |
| 45 | level-45 | act-8 | Hotel Booking | medium | Q28 |
| 46 | level-46 | act-8 | Credit Card Processing | expert | Q32 |
| 47 | level-47 | act-8 | Wire Transfer API | hard | Q47 |
| 48 | level-48 | act-9 | Sorting Large Data Sets | easy | Q21 |
| 49 | level-49 | act-9 | Top-K Bestsellers | easy | Q22 |
| 50 | level-50 | act-9 | Job Scheduler | easy | Q23 |
| 51 | level-51 | act-9 | Bot Fleet Coordinator | hard | Q52 |
| 52 | level-52 | act-9 | Cloud Data Migration | expert | Q51 |
| 53 | level-53 | act-10 | File Downloader | hard | Q43 |
| 54 | level-54 | act-10 | Peer-to-Peer File Transfer (BitTorrent) | hard | Q53 |
| 55 | level-55 | act-10 | Cluster Health Monitor | medium | Q39 |
| 56 | level-56 | act-10 | Distributed Tracing | expert | Q41 |
| 57 | level-57 | act-10 | Distributed Database Control Plane | expert | Q34 |

Difficulty overrides: level-34 is medium (site: Easy) because it extends level-33's counter
with fan-out to millions of open screens. Q31 (IoC / DI framework) is intentionally skipped.

---

## Act 5 (unit C4) + level-6 upgrade

### level-6 · Notification System — upgrade with Q24 (Notification Service at Scale)
sourceUrl: https://systemdesign.io/question/design-a-notification-service-at-scale

Keep id, title, order (7), act, difficulty and the existing missions m1–m7 and both
topology rules. Revise narrative/specs/hints to cover the tips: notification sources
(product services calling the API, plus scheduled and bulk campaigns), channels (push via
APNs/FCM, SMS, email — all behind the Notification Service), user preferences, device
tokens and opt-outs, idempotent delivery with a delivery log, retries with backoff then the
DLQ, and bulk sends fanned out in batches through the queue.

Tips:
1. What channels to support?
2. How to capture notifications - what are the sources?
3. Where to store them temporarily while they are being processed - Queue? Kafka?
4. How to deliver the notifications to channels - Mobile push? Email?
5. Scalability - how does it scale, specially if there is a bulk notification request?
6. How do you ensure that a notification is delivered?

Resources:
- High level overview — https://blog.algomaster.io/p/design-a-scalable-notification-service — article
- Good design by Microsoft engineer — https://serhatgiydiren.com/system-design-interview-notification-service/ — article
- Nice detailed solution video — https://www.youtube.com/watch?v=bBTPZ9NdSk8 — video
- Solution by Google Engineer — https://www.youtube.com/watch?v=J-5JozlYIqI — video

Numbers to add: ~10 M notifications/day steady (~115/s), bulk campaigns of 50 M recipients
that must go out within 1 hour (~14 K/s), so the queue absorbs ~100× the steady rate.

Missions (required, after m1–m7): m8 connect web-server → sql-database (user contact info,
device tokens, preferences, opt-outs, templates); m9 connect worker → nosql-database
(delivery log keyed by idempotency key — retries never double-send and status is
queryable); m10 connect web-server → task-scheduler (schedule a campaign or a send-later);
m11 connect task-scheduler → message-queue (the scheduler enqueues bulk sends in batches).
Bonus (last): m12 add monitoring (existing); m13 connect worker → rate-limiter (respect
per-provider quotas).
Resilience (add): requires-companion task-scheduler ↔ message-queue.

Reference: client → api-gateway → web-server ×2; each web-server → message-queue,
sql-database, task-scheduler, monitoring; task-scheduler → message-queue;
message-queue → worker ×2, dead-letter-queue; each worker → notification-service,
nosql-database, rate-limiter.

### level-25 · Weather App — Q36 · easy
sourceUrl: https://systemdesign.io/question/design-a-weather-application

Tips:
1. How is data ingested - there are two versions of this question: via an API, and via sensors.
2. How often do you collect data via API? If you have sensors, how do you handle real-time data?
3. How do you store the data in the database?
4. What does your frontend look like? How will you update it?

Resources:
- Leetcode Discussion — https://leetcode.com/discuss/interview-question/system-design/1286344/system-design-design-weather-widget — discussion
- Video explanation with sensors — https://www.youtube.com/watch?v=sWNRuClDOo4&t=2s — video
- Another explanation with sensors — https://www.youtube.com/watch?v=PxL8W3WoK5k — video

Problem: a weather app/widget shows current conditions, an hourly + 7-day forecast and a
history chart for any location. This level builds the **API version**: data comes from a
third-party weather provider. Users never trigger provider calls — readings are pulled on a
schedule per grid cell (locations snapped to ~10 km cells) and served from our own stores.
A location enters the poll set the first time someone asks for it. The **sensor version**
is the tradeoff paragraph: sensors would push readings into a message queue and a stream
processor — same storage, different ingest.
Numbers: 10 M DAU × ~5 opens/day ≈ 50 M requests/day ≈ 600 req/s (3 K/s peak at
breakfast time); ~50 K active cells polled every 15 min ≈ 55 provider calls/s;
~200 B per reading → ~1 GB/day of history. Weather changes slowly, so responses can be
cached for minutes at the CDN.

Missions (required): m1 connect client → cdn (cache forecast responses per cell for a few
minutes); m2 cdn → load-balancer; m3 load-balancer → web-server; m4 web-server → cache
(latest conditions + forecast per cell); m5 web-server → timeseries-db (history for the
chart); m6 web-server → task-scheduler (register a new cell for polling); m7
task-scheduler → worker; m8 worker → external-api (pull the provider); m9 worker →
timeseries-db (append readings); m10 worker → cache (refresh latest).
Bonus: m11 connect worker → blob-storage (archive raw provider payloads for backfill and
replay); m12 add monitoring.
Topology: forbidden web-server → external-api ("Never call the weather provider on the
request path — serve from your own stores; the provider is rate-limited and slow");
forbidden client → timeseries-db.
Resilience: no-spof web-server; no-spof worker; requires-companion task-scheduler ↔ worker.

Reference: client → cdn → load-balancer → web-server ×2; each web-server → cache,
timeseries-db, task-scheduler, monitoring; task-scheduler → worker ×2; each worker →
external-api, timeseries-db, cache, blob-storage.

### level-26 · PC Parts Compatibility — Q54 · easy
sourceUrl: https://systemdesign.io/question/design-a-parts-compatibility-feature-for-ecommerce-site

Problem statement (from the page's candidate description — use it in the narrative): "Design
a service for the assemble-a-PC section of the Newegg website, where you pick the different
parts of a PC. The main requirement is a way to tell the customer whether the parts they
picked are compatible. We have to keep track of each part's compatibility with other parts."

Tips (the page's notes):
1. Auto parts compatibility is another way to describe this problem.
2. Presumably, you might have a compatibility list for each part provided. Narrow down the problem to a particular type of part.
3. This problem is more about frontend and DB design than about distributed systems.
4. Keep track of each part's compatibility with other parts, so the customer is told when two parts they picked are not compatible.

Resources: none on the page (empty list — the Read tab shows its empty state).

Design: parts catalog in SQL (part, category, attributes such as CPU socket, RAM type,
form factor, TDP, PSU wattage). Most compatibility is **rule-based on attributes**
(motherboard.socket = cpu.socket; total TDP × 1.5 ≤ psu.watts; case supports the board's
form factor) — a small rules table per category pair, not an N² matrix — plus an explicit
exceptions table (known-incompatible/verified-compatible pairs from vendors). When a user
picks a part, the builder filters the next category to compatible candidates using the
search index's attribute filters; the full build is validated server-side on every change
and on checkout. Saved builds are rows keyed by build id (shareable URL).
Numbers: ~500 K parts in ~12 categories; 2 M builder sessions/day × ~20 picks ≈ 40 M
filter queries/day ≈ 460/s (2 K/s peak); catalog changes are rare (thousands/day), so
precompute and cache aggressively.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server;
m3 web-server → sql-database (catalog, compatibility rules, exceptions, saved builds);
m4 web-server → search-index (filter candidates by attributes); m5 web-server → cache
(compatible-candidate lists and validation results per selection); m6 web-server →
message-queue (catalog/rule change events from the admin API); m7 message-queue → worker;
m8 worker → search-index (re-index affected parts); m9 worker → cache (invalidate affected
entries).
Bonus: m10 connect client → cdn (product images and the builder UI); m11 add monitoring.
Topology: forbidden client → sql-database; required-between via web-server, from client to
search-index.
Resilience: no-spof web-server; requires-companion search-index ↔ worker ("the index must
be kept in sync with the catalog by a Worker").

Reference: client → load-balancer → web-server ×2; client → cdn; each web-server →
sql-database, search-index, cache, message-queue, monitoring; message-queue → worker;
worker → search-index, cache, sql-database.

### level-27 · Wiki & Document Versioning — Q37 · easy
sourceUrl: https://systemdesign.io/question/create-a-document-management-system-like-wikipedia-or-notion

Tips:
1. Note: this question is without real-time editing.
2. How will you store each document? What will the URLs look like?
3. How will you do versioning? This is like Git for documents.
4. How will you restore or view any version with one click?
5. How will you minimize the storage used between versions, aka, how will you store diffs?

Resources:
- Leetcode Discussion — https://leetcode.com/discuss/interview-question/system-design/322448/Content-Management-System-Design — discussion
- Solution from Google Engineer (also covers live editing, which this question does not need) — https://www.youtube.com/watch?v=YCjVIDv0zQY — video
- Detailed Frontend Design — https://www.youtube.com/watch?v=tsGarhpWOws — video

Problem: a Wikipedia/Notion-style document system without real-time co-editing. Pages
have stable URLs (`/wiki/{slug}` mapped to an immutable page id, so renames keep links);
every save creates a new revision (author, timestamp, parent revision, message); any
revision can be viewed, diffed and restored with one click — restore is non-destructive:
it writes a new revision whose content equals the old one. Storage: revision metadata in
SQL; content in Blob Storage as a full snapshot every N revisions (e.g. 20) with diffs in
between, so reading any version costs one snapshot + ≤ 19 diffs; identical content is
deduplicated by content hash. The current rendered version is cached (and at the CDN for
logged-out readers) and purged on edit; a background worker compacts diff chains into
snapshots.
Numbers: ~50 M pages, ~1 B revisions; ~6 edits/s, ~10 K reads/s (reads ≫ writes); average
page ~20 KB, average diff ~1 KB → ~1 B × 1 KB + 50 M × 20 KB per snapshot generation ≈ a few
TB instead of ~20 TB of full copies.

Missions (required): m1 connect client → cdn; m2 cdn → load-balancer; m3 load-balancer →
web-server; m4 web-server → sql-database (pages, slugs, revision metadata); m5 web-server →
blob-storage (snapshots and diffs); m6 web-server → cache (rendered current version);
m7 web-server → message-queue (edit events); m8 message-queue → worker (compact diff
chains, purge caches); m9 worker → blob-storage (write new snapshots).
Bonus: m10 connect worker → search-index (full-text search over current versions);
m11 add monitoring.
Topology: forbidden client → sql-database; required-between via web-server, from client
to blob-storage.
Resilience: no-spof web-server; requires-companion blob-storage ↔ worker.

Reference: client → cdn → load-balancer → web-server ×2; each web-server → sql-database,
blob-storage, cache, message-queue, monitoring; message-queue → worker; worker →
blob-storage, sql-database, cache, search-index.

### level-28 · Facebook Marketplace — Q38 · easy
sourceUrl: https://systemdesign.io/question/build-a-marketplace-feature-for-facebook

Tips:
1. How will you store and retrieve listings?
2. How will you show listings based on location?
3. How will you show recommendations?
4. How will you add search - if a user wants to search for specific items?

Resources:
- Cheat Sheet — https://www.reddit.com/r/leetcode/comments/104wf74/system_design_cheatsheet_online_marketplace/ — discussion
- Craigslist Design — https://medium.com/%40bugfreeai/system-design-interview-practice-design-craigslist-c95ba0238f74 — article
- Mock Interview — https://www.youtube.com/watch?v=2N0TXrgB9AY — video

(The page also says: "For location based listings, refer to geospatial search" — mention the
Yelp level (level-18) in a hint or the narrative.)

Problem: sellers post listings (title, description, price, category, photos, location);
buyers browse listings near them, search by keyword with filters, and get a personalised
"recommended for you" feed. Messaging and payments are out of scope.
Design: listings in a NoSQL store keyed by listing id; photos uploaded to Blob Storage and
served via CDN; a Geospatial Index (geohash cells) answers "listings within 40 km"; a
Search Index handles keyword + category/price filters; both are fed asynchronously from
listing-created/updated events. Recommendations: candidates from the nearby/geo set and
the user's recent searches, ranked by an ML Model Server (click/purchase likelihood);
hot results cached.
Numbers: ~1 B monthly users; ~10 M new listings/day ≈ 115 writes/s; ~200 M daily browsers
× ~20 queries ≈ 4 B reads/day ≈ 46 K/s; ~5 photos × 300 KB per listing ≈ 15 TB/day.

Missions (required): m1 connect client → cdn; m2 cdn → blob-storage (listing photos);
m3 client → load-balancer; m4 load-balancer → web-server; m5 web-server → nosql-database
(listings); m6 web-server → blob-storage (photo upload); m7 web-server → geo-index (browse
nearby); m8 web-server → search-index (keyword search); m9 web-server → ml-model-server
(rank recommendations); m10 web-server → message-queue (listing events); m11
message-queue → worker; m12 worker → search-index; m13 worker → geo-index.
Bonus: m14 connect web-server → cache (hot listings and per-user recommendations);
m15 add monitoring.
Topology: forbidden client → nosql-database; forbidden client → search-index.
Resilience: no-spof web-server; requires-companion search-index ↔ worker;
requires-companion geo-index ↔ worker.

Reference: client → cdn → blob-storage; client → load-balancer → web-server ×2; each
web-server → nosql-database, blob-storage, geo-index, search-index, ml-model-server,
message-queue, cache, monitoring; message-queue → worker; worker → search-index, geo-index.

### level-29 · Photo Sharing (Flickr / Google Photos) — Q45 · medium
sourceUrl: https://systemdesign.io/question/develop-a-photo-sharing-platform-like-flickr-or-google-photos

Tips:
1. Similar to Design Instagram.
2. How will you store a large number of photos?
3. How will you serve a photo and make it fast?
4. How will you generate thumbnails?
5. How will you design the APIs for this?

Resources:
- Must read: Facebook's Photo Storage Paper — https://www.usenix.org/legacy/event/osdi10/tech/full_papers/Beaver.pdf — paper
- High level approach — https://medium.com/%40bugfreeai/key-points-of-a-common-system-design-interview-question-photo-sharing-platform-91f52fa4bf05 — article
- Solution — https://www.geeksforgeeks.org/design-a-picture-sharing-system-system-design/ — article
- Frontend Solution Video — https://www.youtube.com/watch?v=FUKGooQXih8 — video
- Mock Interview — https://interviewing.io/mocks/faang-system-design-photo-sharing-service — video

Problem: users upload photos (resumable uploads), organise them into albums, share albums
by link, browse a timeline, and search by date/place. Unlike Instagram (level-14) there is
no follower feed; the hard parts are **storing billions of small files** and **serving them
fast**. Haystack's lesson (the paper): one file per photo costs several disk seeks just for
filesystem metadata, so photos are packed into large append-only volume files and located
by (volume id, offset) held in an in-memory index — in this level Blob Storage plays that
photo store, with photo metadata (owner, album, volume/offset per size, EXIF date/place,
content hash for dedupe) in NoSQL. Thumbnails (e.g. 4 sizes) are generated asynchronously
by workers after upload; reads are served through the CDN, so the store mostly sees the
long tail. APIs: `POST /uploads` (resumable session) → `PUT` chunks → `POST /photos`
(commit), `GET /photos/{id}?size=`, `GET /albums/{id}`, `POST /albums/{id}/share`.
Numbers: ~100 M uploads/day ≈ 1.2 K/s (peaks after holidays ~5×); ~3 MB per original →
~300 TB/day; 4 thumbnails ≈ 150 KB more per photo; reads ~10× uploads, heavily skewed to
recent photos.

Missions (required): m1 connect client → cdn; m2 cdn → blob-storage; m3 client →
load-balancer; m4 load-balancer → web-server; m5 web-server → blob-storage (originals);
m6 web-server → nosql-database (photo + album metadata); m7 web-server → cache (hot
metadata); m8 web-server → message-queue (photo-uploaded events); m9 message-queue →
worker (thumbnail generation); m10 worker → blob-storage (write thumbnails); m11 worker →
nosql-database (mark sizes ready).
Bonus: m12 connect worker → search-index (search by date, place and detected labels);
m13 add monitoring.
Topology: forbidden web-server → worker ("Don't generate thumbnails inline in the upload
request — enqueue them"); forbidden client → nosql-database.
Resilience: no-spof web-server; no-spof worker; requires-companion blob-storage ↔ cdn.

Reference: client → cdn → blob-storage; client → load-balancer → web-server ×2; each
web-server → blob-storage, nosql-database, cache, message-queue, monitoring;
message-queue → worker ×2; each worker → blob-storage, nosql-database, search-index.

### level-30 · Login & Authentication — Q35 · medium
sourceUrl: https://systemdesign.io/question/design-a-user-login-and-authentication-system

Tips:
1. What methods do you use to authenticate?
2. How do you verify a user's credentials in the backend?
3. How do you maintain an authenticated session?
4. How do you store passwords in a database?
5. How do you handle error flows - like forgotten passwords?

Resources:
- Great explanation — https://www.youtube.com/watch?v=uj_4vxm9u90 — video
- Good solution — https://hackernoon.com/designing-functional-authentication-and-authorization-systems — article
- Good summary — https://www.finalroundai.com/interview-questions/google-design-login-endpoint — article
- Explanation video (1) — https://www.youtube.com/watch?v=fyTxwIa-1U0 — video
- Explanation video (2) — https://www.youtube.com/watch?v=zt8Cocdy15c — video

Problem: sign-up, login and logout for a website with email + password (social login via an
OAuth/OIDC provider is the bonus), sessions that survive page loads, and a forgot-password
flow. Correctness points the narrative/specs must get right:
- Passwords are never stored or logged in plain text: store a per-user salted, deliberately
  slow hash (Argon2id or bcrypt); verify by re-hashing the submitted password and comparing
  in constant time. Return the same generic error for unknown email and wrong password.
- Sessions: after login, issue a random, high-entropy session id (or a short-lived signed
  access token + a refresh token) in an `HttpOnly; Secure; SameSite` cookie; server-side
  session/refresh state lives in a fast store (Redis) with a TTL so logout and revocation
  take effect immediately.
- Forgot password: generate a single-use, short-lived (e.g. 15–30 min) random reset token,
  store only its hash, email the link asynchronously, invalidate existing sessions after the
  reset. Respond identically whether or not the email exists.
- Brute-force protection: rate-limit login attempts per IP and per account (with backoff or
  temporary lockout); MFA is a natural extension.
- Everything over TLS.
Numbers: ~50 M users; ~5 M logins/day ≈ 60/s (600/s peak); session checks happen on every
authenticated request ≈ 50 K/s, so session validation must be a ~1 ms cache lookup, while
password hashing intentionally costs ~50–100 ms of CPU per login attempt.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server;
m3 web-server → auth-service; m4 web-server → rate-limiter (throttle login attempts);
m5 auth-service → sql-database (users: email, password hash + salt, MFA settings);
m6 auth-service → cache (session / refresh-token store with TTL); m7 auth-service →
message-queue (password-reset and verification emails); m8 message-queue → worker;
m9 worker → notification-service (send the email).
Bonus: m10 connect auth-service → external-api ("Sign in with Google" — OAuth/OIDC
provider); m11 add monitoring.
Topology: forbidden web-server → sql-database ("Only the Auth Service touches the
credentials table"); forbidden client → sql-database; required-between via message-queue,
from auth-service to notification-service ("send emails asynchronously, never inside the
login/reset request").
Resilience: no-spof web-server; no-spof auth-service ("if auth is down, nobody can log in");
requires-companion auth-service ↔ cache.

Reference: client → load-balancer → web-server ×2; each web-server → auth-service ×2
(both), rate-limiter; each auth-service → sql-database, cache, message-queue,
external-api, monitoring; message-queue → worker → notification-service.

### level-31 · On-Call Escalation — Q46 · medium
sourceUrl: https://systemdesign.io/question/design-an-oncall-escalation-system

Problem statement (from the page — use it): "Design an on-call escalation system. The levels
of employees handling on-call are Developer, Manager and Director. The initial ticket always
goes to a developer. If a developer is not able to handle the ticket or no developer is
available, the ticket gets escalated to a manager. Similarly, if no manager is available or
a manager is not able to resolve the ticket, it gets escalated to a director. If no one is
available to take the ticket, it goes into a pending queue."

Tips (the page's text, split):
1. The initial ticket always goes to a developer. If no developer is available or able to handle it, it is escalated to a manager, then to a director.
2. If no one is available to take the ticket, it goes into a pending queue.
3. This is a combination of Product and System Design, not really too much into scalability.

Resources:
- Things to consider (Google Doc) — https://docs.google.com/document/d/1yngBZD2xNYfPRMIy1haQQcpSrZLUrIjErIM92d8mFiA/edit?usp=sharing — article

Design (product + data model first): SQL tables `employees(id, level DEV|MGR|DIR, team)`,
`schedules` (who is on call when, availability), `tickets(id, severity, state, assignee,
level, version)`, `ticket_events` (audit trail). A ticket is a state machine:
NEW → ASSIGNED(level) → ACKNOWLEDGED → RESOLVED, with ESCALATE moving it to the next level
and PENDING when nobody at any level is available. The escalation engine (workers consuming
ticket events) assigns the ticket to an available on-call person at the current level,
pages them via the Notification Service, and schedules an acknowledgement timeout with the
Task Scheduler; the timeout (or the assignee pressing "can't handle") emits an escalate
event back onto the queue. Pending tickets are stored durably (state = PENDING, ordered by
severity then age) and re-offered whenever an availability change event arrives.
Assignment uses a conditional update on `version` so two engines can't assign the same
ticket twice.
Numbers: small scale — ~10 K engineers, ~5 K tickets/day; what matters is that no ticket is
lost and timeouts fire on time (ack timeout e.g. 15 min per level).

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server
(ticket + schedule API); m3 web-server → sql-database; m4 web-server → message-queue
(ticket-created and "can't handle" events); m5 message-queue → worker (escalation engine);
m6 worker → sql-database (assignment, state transitions, audit); m7 worker →
notification-service (page the assignee); m8 worker → task-scheduler (ack timeout);
m9 task-scheduler → message-queue (timeout fires an escalate event).
Bonus: m10 connect message-queue → dead-letter-queue; m11 add monitoring.
Topology: forbidden web-server → notification-service ("Paging is done by the escalation
engine, not the request path"); forbidden client → sql-database.
Resilience: no-spof worker ("the escalation engine must not be a single point of
failure"); requires-companion task-scheduler ↔ worker.

Reference: client → load-balancer → web-server ×2; each web-server → sql-database,
message-queue, monitoring; message-queue → worker ×2, dead-letter-queue; each worker →
sql-database, notification-service, task-scheduler; task-scheduler → message-queue.

---

## Act 6 (unit C5)

### level-32 · Who's Viewing This Page — Q49 · easy
sourceUrl: https://systemdesign.io/question/design-a-feature-to-show-the-number-of-users-viewing-a-page

Problem statement (from the page's candidate description — use it): "Design a system that
lets users know the number of other users currently viewing a page, e.g. on a
hotel/accommodation site ('12 people are looking at this hotel')."

Tips (the candidate's notes, condensed):
1. A simple distributed key-value cache (accommodation_id → count) with an increment is a start, but "current" viewers means views within the last 5 minutes, so counts must also go down.
2. Store user ids with timestamps rather than a bare counter, so a user who keeps reloading the page is not counted twice; entries older than 5 minutes must drop out of the count.
3. Replicate the cache geographically; consistency is not a requirement, and a slightly incorrect count can be tolerated for a short time.
4. Persistent storage is probably unnecessary: the counts are temporary, and long-term view tracking belongs to a separate system.

Resources:
- One solution — https://medium.com/%40narasimha4789/from-zero-to-millions-designing-a-real-time-active-user-counter-system-a5d9545bd35e — article
- Related — https://www.youtube.com/watch?v=TuKjdj9YXns — video

Design: while the page is open the client sends a heartbeat every ~30 s (and one on
open). The presence API does, per page key, a sorted-set update `ZADD page:{id} now
userOrSessionId` (re-adding the same id just refreshes it — reloads don't double count),
trims `ZREMRANGEBYSCORE page:{id} -inf now-5min`, and returns `ZCARD` — the heartbeat
response carries the count (pull). Keys get a TTL so abandoned pages vanish. Nothing is
written to a database. Users are geo-routed to their nearest region; each region keeps its
own presence cache and counts can be merged asynchronously — a few seconds of staleness is
fine. For very hot pages, a HyperLogLog per minute bucket gives an approximate distinct
count in constant memory. Bonus: push count changes over WebSockets instead of
piggy-backing on heartbeats.
Numbers: ~5 M concurrent viewers across ~10 M pages; a heartbeat every 30 s ≈ 170 K
writes/s; per entry ~50 B → a few hundred MB of presence state in total.

Missions (required): m1 connect client → dns (geo-route to the nearest region); m2 client
→ load-balancer; m3 load-balancer → web-server (presence/heartbeat API); m4 web-server →
cache (per-page sorted set of viewer ids with timestamps).
Bonus: m5 connect client → websocket-server (push count changes); m6 websocket-server →
cache; m7 add monitoring.
Topology: forbidden web-server → sql-database and forbidden web-server → nosql-database
("Presence is ephemeral — don't write every heartbeat to a database; keep it in the cache
with a TTL").
Resilience: no-spof web-server; no-spof cache ("replicate the presence cache so one node
failure doesn't zero every count").

Reference: client → dns; client → load-balancer → web-server ×2; each web-server →
cache ×2 (both), monitoring; client → websocket-server → cache ×2 (both).

### level-33 · Facebook Like Counter — Q33 · medium
sourceUrl: https://systemdesign.io/question/count-facebook-likes-especially-for-popular-users

Tips:
1. To clarify: what scale are we looking at - what can the peak traffic be?
2. This is a distributed counters problem - how will you scale it as the likes grow?
3. How will you handle celebrity users, who get a huge number of counts really fast?
4. How do you deal with system failures? You will need some replication.

Resources:
- Discussion on Blind — https://www.teamblind.com/post/System-Design-Question-How-does-FBInsta-storeretrieve-likes-NZEcwqVp — discussion
- Detailed Solution — https://systemdesign.one/distributed-counter-system-design/ — article
- Video Solution — https://blog.interviewcamp.io/live-design-facebook-likes-distributed-counter — video

Design: liking writes a like record keyed (post_id, user_id) with a conditional insert —
one like per user, unlike deletes it, "did I like this?" is a point read. The count is
never `COUNT(*)`: the like API also appends a like/unlike event to a log partitioned by
post id; stream processors aggregate events per post over ~1 s windows and apply one
batched `count += n` per post per window, so a celebrity post receiving 10 K likes/s costs
~1 counter write/s instead of 10 K contended writes. For extreme keys, split the counter
into N sharded sub-counters summed on read. Counts are served from the cache (≈ real time,
eventually consistent). Failures: the log and the counter store are replicated (RF = 3);
the stream processor commits offsets only after applying a batch, and can rebuild a counter
by replaying the log or recounting like records.
Numbers: ~5 B likes/day ≈ 58 K/s average, ~500 K/s peak; one celebrity post can take
~1 M likes in a few minutes (5–10 K/s on one key); count reads ≈ every feed impression,
~100× writes (millions/s) → cache.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server;
m3 web-server → nosql-database (like records, conditional insert); m4 web-server →
message-queue (like/unlike events partitioned by post id); m5 message-queue →
stream-processor (batch per post); m6 stream-processor → nosql-database (counter rows);
m7 stream-processor → cache (current counts); m8 web-server → cache (read counts).
Bonus: m9 connect cache → nosql-database (fill a count on cache miss); m10 add monitoring.
Topology: forbidden client → nosql-database; forbidden client → cache; required-between
via message-queue, from web-server to stream-processor.
Resilience: no-spof web-server; no-spof stream-processor; no-spof nosql-database
("replicate the counters and like records").

Reference: client → load-balancer → web-server ×2; each web-server → nosql-database ×2
(both), message-queue, cache, monitoring; message-queue → stream-processor ×2; each
stream-processor → nosql-database ×2 (both), cache; cache → nosql-database ×2 (both).

### level-34 · Live Like Updates — Q50 · medium
sourceUrl: https://systemdesign.io/question/design-facebook-likes-feature-with-live-updates

Tips:
1. Related to the Facebook Likes counter question, but with live updates as an addition.
2. How will you push live updates to millions of users?

(The page's tip says "Related to Question 23" — that number refers to the site's own list;
write "the Facebook Likes counter question" and mention level-33 in the narrative.)

Resources:
- Video Solution — https://www.youtube.com/watch?v=T4bmFz-BSDk — video

Design: level-33's write path unchanged (like record + event log + stream aggregation +
cached count). Add the push path: each open app/browser keeps a WebSocket to a socket
server and subscribes to the post ids currently on screen. The stream processor already
batches per post; it publishes at most one "post X now has N likes" update per post per
~1–2 s to a Pub/Sub topic for that post. Socket servers subscribe to the topics their
connected clients care about and push to them — one publish fans out to thousands of
socket servers, each pushing to its local viewers. Coalescing is essential: nobody needs
10 K updates/s on a celebrity post; they need the number to tick every second or two.
Numbers: ~100 M concurrent connections (~100 K per socket server → ~1,000 servers); a hot
post can have millions of simultaneous viewers; update rate per post capped at ~1/s.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server;
m3 web-server → nosql-database; m4 web-server → message-queue; m5 message-queue →
stream-processor; m6 stream-processor → nosql-database; m7 stream-processor → cache;
m8 web-server → cache; m9 client → websocket-server (subscribe to on-screen posts);
m10 stream-processor → pub-sub (throttled per-post count updates); m11 pub-sub →
websocket-server (fan-out).
Bonus: m12 connect websocket-server → cache (send the current count when a client
subscribes); m13 add monitoring.
Topology: forbidden web-server → websocket-server ("Don't have the like API call socket
servers — publish once and let Pub/Sub fan out"); required-between via pub-sub, from
stream-processor to websocket-server.
Resilience: no-spof websocket-server; no-spof stream-processor; requires-companion
websocket-server ↔ pub-sub.

Reference: client → load-balancer → web-server ×2; client → websocket-server ×2; each
web-server → nosql-database, message-queue, cache, monitoring; message-queue →
stream-processor ×2; each stream-processor → nosql-database, cache, pub-sub; pub-sub →
websocket-server ×2; each websocket-server → cache.

### level-35 · Live Comments — Q48 · hard
sourceUrl: https://systemdesign.io/question/design-a-live-comments-feature-for-facebook

Tips:
1. How will you push live comments to all users?
2. How will you make sure new comments are delivered in real-time?
3. How will you ensure millions of users get live comments in real time?

Resources:
- Great Solution — https://www.hellointerview.com/learn/system-design/problem-breakdowns/fb-live-comments — article
- Video Solution from Meta Engineer — https://www.youtube.com/watch?v=LjLx0fCd1k8 — video
- FB Engineering Blog — https://engineering.fb.com/2011/02/07/core-infra/live-commenting-behind-the-scenes/ — article
- Leetcode Discussion — https://leetcode.com/discuss/post/583184/fbinstagram-live-comments-system-design-fqtzt/ — discussion

Problem: viewers of a live video post comments and see everyone's new comments within ~2 s;
late joiners see the recent history and can scroll back. Design (Hello Interview's
breakdown): posting is a plain HTTP write — the comment service persists the comment
(NoSQL partitioned by video id, sorted by time) and publishes it to the video's Pub/Sub
channel. Viewers hold a persistent connection (WebSocket or SSE) to realtime servers; the
L7 load balancer routes viewers of the same video to the same subset of realtime servers
(consistent hashing on video id) so each server subscribes to few channels. Each realtime
server receives a comment once and pushes it to all its local viewers. History: the last
~N comments per live video are cached for joiners; older pages come from the store with a
cursor. On mega-streams, clients cannot render thousands of comments per second, so
servers can sample/rank what they push.
Numbers: ~100 M concurrent viewers platform-wide; the top stream has ~1 M viewers and
~1 K comments/s; delivery p99 < 2 s.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server
(comment API); m3 load-balancer → websocket-server (realtime connections, routed by video
id); m4 web-server → nosql-database (persist comments); m5 web-server → pub-sub (publish to
the video's channel); m6 pub-sub → websocket-server; m7 web-server → cache (recent comments
for joiners).
Bonus: m8 connect web-server → rate-limiter (throttle comment spam); m9 add monitoring.
Topology: forbidden web-server → websocket-server; forbidden client → nosql-database;
required-between via pub-sub, from web-server to websocket-server.
Resilience: no-spof web-server; no-spof websocket-server; requires-companion
websocket-server ↔ pub-sub.

Reference: client → load-balancer; load-balancer → web-server ×2, websocket-server ×2;
each web-server → nosql-database, pub-sub, cache, rate-limiter, monitoring; pub-sub →
websocket-server ×2.

### level-36 · Live Stock Prices — Q44 · easy
sourceUrl: https://systemdesign.io/question/design-a-system-to-view-latest-stock-prices

Tips:
1. How will you ingest real time data?
2. How will you store the data, if you need to display a graph?
3. How will you group data by stock symbol?
4. Once updated in the backend, how will you update it in your dashboard? pull or push?

Resources:
- Leetcode Discussion — https://leetcode.com/discuss/interview-question/system-design/431712/Bloomberg-or-Design-a-system-to-give-prices-of-a-stock — discussion
- Detailed solution — https://harshsavasil.medium.com/design-real-time-stock-price-feed-9e1fba0a1c4e — article
- Real case study — https://www.paytmmoney.com/blog/how-we-built-an-in-house-price-alerts-system/ — article

Design: feed handlers keep persistent connections to exchange/vendor market-data feeds
(the Third-Party API), normalise ticks and publish them to a log partitioned by symbol
(grouping by symbol keeps per-symbol ordering). Exchanges trade on schedules, so the Task
Scheduler starts and stops feed handlers per exchange's trading hours (the admin API
registers exchanges with it). Stream processors keep the latest quote per symbol in the
cache and roll ticks into OHLC candles (1 s / 1 min) in the time-series DB for charts.
Dashboards use **push**: clients hold a WebSocket and subscribe to their watch-list
symbols; stream processors publish throttled updates (≤ a few per second per symbol) to
Pub/Sub, and socket servers fan them out. REST serves the initial quote and chart history.
Numbers: ~100 K symbols on ~60 exchanges; ~1 M ticks/s at the open; ~10 M concurrent
dashboard users; candles: 100 K symbols × 1/min ≈ 144 M rows/day.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server
(quote + chart API); m3 web-server → cache (latest quote); m4 web-server → timeseries-db
(chart history); m5 web-server → task-scheduler (exchange trading hours); m6
task-scheduler → worker (start/stop feed handlers); m7 worker → external-api (exchange
feed); m8 worker → message-queue (ticks partitioned by symbol); m9 message-queue →
stream-processor; m10 stream-processor → cache; m11 stream-processor → timeseries-db
(candles); m12 client → websocket-server; m13 stream-processor → pub-sub; m14 pub-sub →
websocket-server.
Bonus: m15 connect message-queue → blob-storage (raw tick archive for replay); m16 add
monitoring.
Topology: forbidden web-server → external-api; forbidden client → timeseries-db.
Resilience: no-spof worker ("run redundant feed handlers"); no-spof websocket-server;
requires-companion message-queue ↔ stream-processor.

Reference: client → load-balancer → web-server ×2; client → websocket-server ×2; each
web-server → cache, timeseries-db, task-scheduler, monitoring; task-scheduler → worker ×2;
each worker → external-api, message-queue; message-queue → stream-processor, blob-storage;
stream-processor → cache, timeseries-db, pub-sub; pub-sub → websocket-server ×2.

### level-37 · Price Alerts — Q30 · easy
sourceUrl: https://systemdesign.io/question/design-a-price-alert-system-for-amazon-or-stock-prices

Tips:
1. How will you scrape the data, if there is no API?
2. What constitutes a price alert? Are there any rules a user can add - rule based alerts?
3. How do you maintain the scraped data even if the html changes?

Resources:
- Leetcode Discussion — https://leetcode.com/discuss/interview-question/system-design/5745135/Design-Stock-price-Notification-System — discussion
- Good solutions — https://dilipkumar.medium.com/price-drop-tracker-system-design-d2f9ed36a935 — article
- Another solution — https://www.tryexponent.com/questions/3371/design-amazon-price-tracker — article

Problem: users watch Amazon products and create rule-based alerts ("price ≤ $X", "drops by
≥ 10 %", "back in stock"); they get an email/push when a rule fires (once per crossing).
There is no price API, so product pages are scraped. Design: the watch API stores alerts in
SQL indexed by product id; the first alert on a product registers it with the Task
Scheduler, which enqueues crawl jobs with a per-product frequency (popular/most-watched
products more often, e.g. hourly vs daily). Scraper workers fetch pages from the retailer
(Third-Party API) politely (rate limits, backoff, rotating schedule), extract the price
from structured data first (JSON-LD / meta tags) and fall back to versioned CSS-selector
parsers; parse failures are measured and alert the team so parsers get fixed (raw HTML is
kept so prices can be re-extracted). Each new price is appended to price history; on a
change, the worker queries alerts for that product whose rule is now satisfied, marks
them fired (idempotent) and sends notifications.
Numbers: ~50 M watched products; average every 6 h → ~2.3 K fetches/s; ~20 M users with
~10 alerts each = 200 M alerts; a few million fired alerts/day.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server;
m3 web-server → sql-database (alerts + rules); m4 web-server → task-scheduler (track a
product); m5 task-scheduler → message-queue (crawl jobs); m6 message-queue → worker;
m7 worker → external-api (fetch the product page); m8 worker → timeseries-db (price
history); m9 worker → sql-database (match and mark fired alerts); m10 worker →
notification-service.
Bonus: m11 connect worker → blob-storage (raw HTML snapshots for re-parsing after layout
changes); m12 add monitoring (parse-failure rate).
Topology: forbidden web-server → external-api ("never scrape on the request path");
forbidden web-server → notification-service ("alerts fire from the pipeline, not the
request path").
Resilience: no-spof worker; requires-companion task-scheduler ↔ message-queue.

Reference: client → load-balancer → web-server ×2; each web-server → sql-database,
task-scheduler, monitoring; task-scheduler → message-queue → worker ×2; each worker →
external-api, timeseries-db, sql-database, notification-service, blob-storage.

### level-38 · Netflix Screen Limit — Q26 · hard
sourceUrl: https://systemdesign.io/question/netflix-limit-the-number-of-screens-each-user-can-watch

Tips (the page's 3 questions, then its 3 notes):
1. How do you identify each device?
2. Once you do, how do you keep track of the number of users watching it?
3. How do you scale this at a global level - with millions of users watching at once?
4. On mobile and TVs you run the app, so you have access to device identifiers (for example the phone model and the advertising identifier on iOS) and can record each device in a backend cache.
5. On the web, you can use the IP address and create a browser session, and use that as the key in a table maintaining sessions for a user.
6. Combining the above, you can tell how many people are watching from an account at any given time.

Resources: none on the page (empty list).

Problem: each plan allows N concurrent streams (Basic 1, Standard 2, Premium 4). Starting
playback beyond the limit must be refused ("too many people are using your account"); a
stream that stops — or whose device crashes — must free its slot within ~2 minutes.
Design: every play request goes through the playback/licence API, which authenticates the
account and device (device id from the app; a browser-session id + IP on the web). It then
takes a **stream lease** in the cache: per account, a set of {deviceId → expiresAt};
an atomic script drops expired leases, checks `size < maxStreams` (from the account's plan
in SQL) and adds/refreshes this device's lease with ~2 min expiry — all in one step so two
devices racing for the last slot can't both win. Players heartbeat every ~60 s to renew;
stop releases. Video bytes come from the CDN; only licence/lease calls hit the API. Scale:
leases are sharded by account id; an account's lease key lives in one home region (a
cross-region check costs ~100 ms only at play start). Start/stop events go to a queue for
session history, audit and account-sharing analytics.
Numbers: ~250 M accounts; ~50 M concurrent streams at peak; lease renewals every 60 s ≈
830 K writes/s; play starts ≈ 50 K/s at peak.

Missions (required): m1 connect client → cdn (video segments); m2 client → load-balancer;
m3 load-balancer → web-server (playback/licence API); m4 web-server → auth-service (verify
account + device); m5 web-server → sql-database (plan limits, registered devices); m6
web-server → cache (atomic stream leases with expiry); m7 web-server → message-queue
(start/stop events); m8 message-queue → worker; m9 worker → nosql-database (session
history).
Bonus: m10 connect cdn → blob-storage (video origin); m11 add monitoring.
Topology: forbidden client → cache; required-between via web-server, from client to cache.
Resilience: no-spof web-server; no-spof cache ("the lease store is on every play path —
replicate it"); requires-companion message-queue ↔ worker.

Reference: client → cdn → blob-storage; client → load-balancer → web-server ×2; each
web-server → auth-service, sql-database, cache ×2 (both), message-queue, monitoring;
message-queue → worker → nosql-database.

---

## Act 7 (unit C6)

### level-39 · Find a Driver — Q40 · hard
sourceUrl: https://systemdesign.io/question/find-a-rider-for-uber-or-uber-eats

Tips:
1. Very similar to Proximity Service (Find Nearby Friends). This problem is about maintaining a large geospatial index.
2. How do you maintain a geospatial index of drivers?
3. In that index, how do you update the driver location quickly?
4. How do you remove the driver as soon as you match a rider? You don't want the driver to be matched at the same time.
5. How do you ensure efficient edits - when a driver location changes, your algorithm should update the index fast.

Resources:
- Excellent article on geospatial algorithms — https://blog.mapbox.com/a-dive-into-spatial-search-algorithms-ebd0c5e39d2a — article
- Good solution for Yelp, which applies here — https://systemdesignschool.io/problems/yelp/solution — article
- Popular Video — https://www.youtube.com/watch?v=M4lR_Va97cQ — video
- Mock Interview — https://www.youtube.com/watch?v=atywHEArk1w — video

Problem: match a rider's request to a nearby available driver within seconds. Unlike Yelp
(level-18), the indexed objects move constantly, so the index must be write-optimised.
The Client here is both the driver app and the rider app. Design: driver apps send a
location every ~4 s; the location API updates an **in-memory** geospatial index of
available drivers in place (geohash/H3 cell → set of driver ids; moving a driver is a
remove from the old cell + add to the new one, O(1); Redis GEO does this with GEOADD) — a
quadtree that must rebalance is a poor fit for this write rate. A ride request is enqueued;
the matching service queries the rider's cell and neighbouring rings for available
drivers, ranks them by ETA, and **reserves** the chosen driver atomically (`SET driver:{id}
NX EX 15` — or a conditional status update AVAILABLE → OFFERED) before offering, removing
them from the available index so two riders can never be matched to the same driver. The
offer is pushed to the driver over their open WebSocket; on accept the trip is written to
SQL; on decline/timeout the reservation expires and the next candidate is tried.
Numbers: ~5 M online drivers at peak × 1 update / 4 s ≈ 1.25 M location writes/s;
~300 ride requests/s at peak per large region set; match p95 < 5 s.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server
(location + ride-request API); m3 web-server → geo-index (update driver positions in
place); m4 web-server → message-queue (ride requests); m5 message-queue → worker (matching
service); m6 worker → geo-index (nearby available drivers; remove the matched one);
m7 worker → cache (atomic driver reservation with expiry); m8 worker → sql-database
(trips); m9 client → websocket-server (driver app's open connection); m10 worker →
websocket-server (push the offer).
Bonus: m11 connect worker → ml-model-server (rank candidates by predicted ETA and
acceptance); m12 add monitoring.
Topology: forbidden client → geo-index; forbidden client → cache.
Resilience: no-spof web-server; no-spof worker; no-spof geo-index ("replicate the
in-memory driver index"); requires-companion worker ↔ cache.

Reference: client → load-balancer → web-server ×2; client → websocket-server; each
web-server → geo-index ×2 (both), message-queue; message-queue → worker ×2; each worker →
geo-index ×2 (both), cache, sql-database, websocket-server, ml-model-server, monitoring.

### level-40 · ETA & Live Location Sharing — Q27 · expert
sourceUrl: https://systemdesign.io/question/design-eta-and-location-sharing-between-uber-driver-and-rider

Tips:
1. How can you utilize past rides data for calculating the ETA?
2. How can you estimate an ETA directly from maps data?
3. What if you have your own maps modeled as graphs? How can you calculate ETA there?
4. For live location sharing, how do you update the location from the driver's device? Will you use push or pull?
5. How can you transmit location updates fast to the other user?

Resources:
- ETA prediction (ML system design, Uber Eats-related) — https://mecha-mind.medium.com/ml-system-design-eta-prediction-9dc8000fd86b — article
- Google Maps ETA: high level approach — https://www.finalroundai.com/interview-questions/google-maps-eta-compute — article
- Live location tracking: best practices (ok, but not interview depth) — https://www.linkedin.com/pulse/building-live-location-tracking-app-best-practices-real-time-das-cuujc/ — article
- Location tracking system design on GitHub (ok, but not interview depth) — https://github.com/praveenkumardec89/location-tracking-system-design — article

Problem (the page notes this is after a driver has been matched): show the rider the
driver moving on the map in real time, plus an ETA to pickup and to destination that
stays accurate as traffic changes. The Client is both apps. Part 1 — ETA: the road network
is a graph (intersections = nodes, road segments = edges weighted by travel time); a
routing engine (Dijkstra/A* with contraction hierarchies for speed) gives a base ETA from
current segment speeds; live speeds come from aggregating all drivers' GPS pings per
segment; an ML model trained offline on past trips (time of day, weather, pickup/drop-off
patterns, the routing ETA as a feature) corrects the residual error. Part 2 — location
sharing: the driver app **pushes** a GPS fix every 2–4 s over a persistent WebSocket
(polling would add latency and load); the socket tier publishes it to the trip's Pub/Sub
channel and the rider's socket server pushes it on — end-to-end < 1 s. The same pings flow
into a stream that updates segment speeds and archives trips for training.
Numbers: ~5 M drivers online × 1 ping / 4 s ≈ 1.25 M pings/s; ~2 M trips in progress at
peak; ~100 K ETA requests/s (every app open and re-route), p99 < 200 ms.

Missions (required): m1 connect client → load-balancer; m2 load-balancer →
websocket-server (persistent connections for both apps); m3 websocket-server → pub-sub
(driver location to the trip channel); m4 pub-sub → websocket-server (deliver to the
rider's server); m5 websocket-server → message-queue (GPS ping stream); m6 message-queue →
stream-processor (live segment speeds); m7 stream-processor → cache (speed per road
segment); m8 load-balancer → web-server (ETA API); m9 web-server → graph-database (road
graph routing); m10 web-server → cache (live speeds); m11 web-server → ml-model-server
(ETA correction).
Bonus: m12 connect message-queue → blob-storage (archive pings and trips for training);
m13 add monitoring.
Topology: forbidden client → graph-database; forbidden client → ml-model-server.
Resilience: no-spof websocket-server; no-spof web-server; requires-companion
stream-processor ↔ cache.

Reference: client → load-balancer; load-balancer → websocket-server ×2, web-server ×2;
each websocket-server → pub-sub, message-queue; pub-sub → websocket-server ×2;
message-queue → stream-processor, blob-storage; stream-processor → cache; each web-server
→ graph-database, cache, ml-model-server, monitoring.

### level-41 · Surge Pricing — Q25 · expert
sourceUrl: https://systemdesign.io/question/surge-pricing-system-uber

Tips:
1. How do you decide when surge pricing is needed?
2. How do you calculate the pricing?
3. How do you integrate it into an existing ride sharing system?

Resources:
- Good overview — https://docs.google.com/document/d/1uJpPuhO6vZK_VCxBYKbCJoQYrbFE9Ihrsfs919X8f40/edit?usp=sharing — article
- GPT Solution — https://docs.google.com/document/d/1hfUmr8SpBMCkEMlOeXl6Y-H85PMzq-zd07Isb1ltWZE/edit?usp=sharing — article

Problem: raise prices where demand outstrips supply, to pull drivers in and ration rides,
without flapping and without changing a price the rider already accepted. Design:
**when** — the city is divided into hexagonal cells (H3, ~1–2 km); every minute, per
cell, a stream job counts demand (fare quotes / ride requests) and supply (available
drivers from location pings) over a sliding window; **how** — a pricing model maps the
demand/supply ratio (plus short-term demand forecast, events, weather) to a multiplier,
smoothed (EWMA) with hysteresis and caps so prices don't oscillate; results are written to
a per-cell multiplier map in the cache with an expiry. **Integration** — surge is computed
off the request path: the quote API only reads the multiplier for the pickup cell,
returns a fare and stores a **locked quote** (price, multiplier, expiry ~2 min) so the
rider pays what they saw; dispatch is unchanged. Every multiplier change is kept for
audit, analytics and regulators; driver apps show a heatmap from the same map.
Numbers: ~500 K active cells; inputs ≈ 1.25 M driver pings/s + ~50 K quote events/s;
multipliers recomputed every 60 s per cell; quote reads ~50 K/s, p99 < 50 ms.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server
(quote + ride-request API, driver pings); m3 web-server → message-queue (demand and supply
events); m4 message-queue → stream-processor (per-cell windows); m5 stream-processor →
ml-model-server (multiplier from supply/demand features); m6 stream-processor → cache
(multiplier per cell); m7 web-server → cache (read the multiplier at quote time); m8
web-server → sql-database (locked quotes and trips).
Bonus: m9 connect message-queue → data-warehouse (audit and pricing analytics); m10 add
monitoring.
Topology: forbidden web-server → ml-model-server ("Don't compute surge on the quote path —
read the precomputed multiplier"); required-between via message-queue, from web-server to
stream-processor.
Resilience: no-spof web-server; no-spof stream-processor; requires-companion
stream-processor ↔ cache.

Reference: client → load-balancer → web-server ×2; each web-server → message-queue, cache,
sql-database, monitoring; message-queue → stream-processor ×2, data-warehouse; each
stream-processor → ml-model-server, cache.

### level-42 · A/B Testing Platform — Q29 · hard
sourceUrl: https://systemdesign.io/question/design-an-ab-testing-system-like-optimizely

Tips:
1. How will you store and retrieve different treatment UI?
2. How will you measure the success metrics for each treatment?
3. How will you assign a treatment to a user and maintain it for that user across sessions?
4. How will the company admin see the treatments?
5. How will you store the information for the tests? Or, how will you structure the database?
6. How will you easily turn the test on and off?

Resources:
- Good design — https://chuan-zhang.medium.com/building-a-trustworthy-a-b-testing-platform-practical-guide-and-an-architecture-demonstration-332446724ba0 — article
- High level overview — https://xhinliang.medium.com/how-to-design-an-a-b-test-system-1450b06933f — article
- Building a small homemade A/B test engine — https://medium.com/studocu-techblog/recipe-for-implementing-a-homemade-a-b-testing-engine-2e95c97c8020 — article

Problem: product teams define experiments (variants, traffic split, targeting, success
and guardrail metrics); users are assigned consistently; results show which variant wins
with statistical confidence; any test can be stopped instantly. Design: experiment
definitions live in SQL (experiments, variants with a JSON config payload, allocation,
targeting rules, metrics, state, results). Treatments are **configuration**, not code
forks: each variant carries parameters/component keys the app renders; heavy assets live
behind the CDN. The Feature Flag Service distributes the active configuration to SDKs,
which evaluate locally: `bucket = hash(experimentId + userId) mod 100` maps a user to a
variant deterministically, so the same user gets the same treatment on every session and
device without storing assignments (anonymous users use a persistent cookie id). Turning a
test off is a flag flip that propagates in seconds. Clients log exposure and metric events
(clicks, conversions) to the event pipeline; a stream job watches guardrails (sample-ratio
mismatch, error spikes) in near real time, raw events land in the warehouse, and a daily
batch job computes per-variant metrics with confidence intervals (t-test, CUPED) into the
results tables the admin dashboard reads.
Numbers: ~100 M DAU; ~500 concurrent experiments; assignment is evaluated on ~1 M
requests/s (local hashing, no database read); ~20 B events/day ≈ 230 K/s.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server (app
+ experiment admin API); m3 web-server → feature-flag-service (assignment and variant
config); m4 web-server → sql-database (experiments, variants, results); m5 web-server →
message-queue (exposure and metric events); m6 message-queue → stream-processor
(real-time guardrails); m7 message-queue → data-warehouse (raw events); m8 web-server →
task-scheduler (schedule daily analysis for running experiments); m9 task-scheduler →
batch-processor; m10 batch-processor → data-warehouse (per-variant metrics and
significance); m11 batch-processor → sql-database (write results for the dashboard).
Bonus: m12 connect client → cdn (variant assets); m13 stream-processor →
notification-service (alert the owner when a guardrail regresses).
Topology: forbidden client → sql-database; forbidden web-server → data-warehouse ("events go
through the log; never write to or query the warehouse on the request path").
Resilience: no-spof web-server; no-spof feature-flag-service ("assignment runs on every
request"); requires-companion task-scheduler ↔ batch-processor.

Reference: client → cdn; client → load-balancer → web-server ×2; each web-server →
feature-flag-service ×2 (both), sql-database, message-queue, task-scheduler;
message-queue → stream-processor, data-warehouse; stream-processor → notification-service;
task-scheduler → batch-processor; batch-processor → data-warehouse, sql-database.

### level-43 · Ads in the Feed — Q55 · expert
sourceUrl: https://systemdesign.io/question/develop-ads-management-and-display-system-for-social-feed

Tips:
1. How do you create an ad and display it in your feed?
2. How do you run an auction?
3. How can you target ads to certain demographics?
4. How do you measure performance - clicks, views?

Resources:
- Overview video — https://www.youtube.com/watch?v=Zcv_899yqhI&t=2s — video
- One solution — https://dilipkumar.medium.com/facebook-instagram-ad-system-design-e828296ae84a — article

Problem: advertisers create campaigns (budget, bid, schedule, targeting by age, location,
interests; creatives); the feed shows ads in slots; each slot is filled by an auction;
advertisers see impressions, clicks and spend. The Web Server tier here serves the ads
manager API and plays the ad server inside the feed request. Design: campaigns in SQL;
creatives in Blob Storage behind the CDN; campaign changes stream to workers that build a
**targeting index** (inverted index: attribute value → eligible ads) in the search index.
Serving a slot: load the user's features (cache), retrieve candidate ads whose targeting
matches, predict click probability per candidate with the ML Model Server, rank by
expected value (eCPM = bid × pCTR × 1000, plus a quality term), run a generalized
second-price auction (winner pays just enough to beat the runner-up), and skip campaigns
whose budget is exhausted (spend counters in the cache, with pacing so budgets last the
day). Measurement: impression and click events flow through the log; a stream job dedupes
them, filters invalid traffic, updates spend counters within seconds and feeds the
warehouse for reporting and billing.
Numbers: ~2 B users; ~500 K ad requests/s at peak, auction p99 < 100 ms; ~10 M active
ads; ~1 M impression/click events/s.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server
(feed + ads manager API); m3 web-server → sql-database (campaigns, budgets, bids);
m4 web-server → message-queue (campaign changes, impression and click events); m5
message-queue → worker (build the targeting index); m6 worker → search-index; m7
web-server → search-index (candidate retrieval); m8 web-server → ml-model-server (pCTR
for the auction); m9 web-server → cache (user features and remaining budget); m10
message-queue → stream-processor (dedupe, spend); m11 stream-processor → cache (spend and
pacing counters); m12 stream-processor → data-warehouse (reporting and billing); m13
client → cdn (creatives).
Bonus: m14 connect cdn → blob-storage (creative origin); m15 add monitoring.
Topology: forbidden client → search-index; forbidden web-server → data-warehouse ("never
query the warehouse while serving an ad").
Resilience: no-spof web-server; no-spof stream-processor ("if spend counting stops,
campaigns overspend"); requires-companion search-index ↔ worker.

Reference: client → cdn → blob-storage; client → load-balancer → web-server ×2; each
web-server → sql-database, message-queue, search-index, ml-model-server, cache,
monitoring; message-queue → worker, stream-processor ×2; worker → search-index; each
stream-processor → cache, data-warehouse.

---

## Act 8 (unit C7)

### level-44 · 6 Million Free Burgers — Q42 · medium
sourceUrl: https://systemdesign.io/question/design-backend-to-distribute-6-million-burgers-in-one-hour

Tips:
1. How is the food delivered? Email notification?
2. How do you store the number of vouchers left?
3. How do you ensure that the number of vouchers is reduced exactly once per user?
4. How do you do this within the deadline - calculate rate of processing needed and machines needed for that.
5. What if something fails, how do you handle that?

Resources:
- Mock Interview — https://interviewing.io/mocks/google-system-design-design-a-free-food-app — video
- Another Mock Interview — https://interviewing.io/questions/design-a-free-food-app — video
- Reddit discussion — https://www.reddit.com/r/softwarearchitecture/comments/xlztzr/interview_systems_design_question_that_i_want/ — discussion

Problem: a promotion gives away 6 M free burgers in one hour, at most one per user. Users
claim in the app and receive a voucher code (email/push) that they redeem in a restaurant.
Design: pre-generate 6 M unique voucher codes into a list in an in-memory store. A claim
runs one atomic script: if the user already has a claim marker, return it (idempotent);
otherwise pop a code and set `claimed:{userId}` — so the count drops exactly once per
user and never below zero. The claim is acknowledged immediately and a durable record is
written asynchronously through a queue to SQL (`user_id` primary key = second line of
defence); workers send the voucher by email/push with retries. The in-memory store runs
with a replica and append-only persistence; on failover, claims are reconciled from the
durable records. A rate limiter / waiting room sheds excess load; once codes run out the
"sold out" response is served from the CDN.
Numbers: 6 M / 3,600 s ≈ 1,700 claims/s on average, but demand is front-loaded: ~50 M
users may try in the first minutes → ~100 K requests/s; at ~2 K requests/s per web
server that is ~50 servers at the peak (autoscaled), while the store handles ~100 K
simple atomic ops/s per node.

Missions (required): m1 connect client → cdn (app shell and the sold-out page); m2 client →
load-balancer; m3 load-balancer → web-server; m4 web-server → rate-limiter; m5
web-server → cache (atomic claim: per-user marker + pop a code); m6 web-server →
message-queue (claim records); m7 message-queue → worker; m8 worker → sql-database
(durable claims, unique per user); m9 worker → notification-service (send the code).
Bonus: m10 connect message-queue → dead-letter-queue; m11 add monitoring.
Topology: forbidden web-server → sql-database ("don't hit the database on the claim path at
100 K requests/s"); forbidden web-server → notification-service.
Resilience: no-spof web-server; no-spof worker; no-spof cache ("run the voucher store with
a replica so a crash doesn't lose the inventory").

Reference: client → cdn; client → load-balancer → web-server ×2; each web-server →
rate-limiter, cache ×2 (both), message-queue, monitoring; message-queue → worker ×2,
dead-letter-queue; each worker → sql-database, notification-service.

### level-45 · Hotel Booking — Q28 · medium
sourceUrl: https://systemdesign.io/question/design-a-hotel-booking-system

Tips:
1. This is more high level than most distributed systems questions.
2. Database design - first come up with the features and then design the DB.
3. Which DB will you use, and why?
4. API Design for the different functionalities.
5. How do you query for room availability?
6. If two people reserve a room at the same time, how will you handle that?
7. While a person is checking out a room, how do you prevent others from booking the room?

Resources:
- Solution from FAANG Engineer — https://www.youtube.com/watch?v=Ale7Fn921GQ — video
- Hotel reservation (ByteByteGo) — https://bytebytego.com/courses/system-design-interview/hotel-reservation-system — course
- Good API and High Level Design — https://javascript.plainenglish.io/how-to-design-a-hotel-booking-system-56ef18b6adfc — article
- High Level Backend Design Video — https://www.youtube.com/watch?v=m67Mjbx6DMY — video
- Mock Interview — https://www.tryexponent.com/blog/design-a-hotel-booking-service-system-design-interview-question-answer — article

Problem: search hotels by city and dates, see room types with prices and availability,
reserve, pay, cancel. Features first, then the DB: a **relational database** (ACID
transactions and constraints matter more than raw scale here): `hotel`, `room_type`,
`room_type_inventory(hotel_id, room_type_id, date, total, reserved)` — one row per room
type per night — and `reservation(id, guest_id, hotel_id, room_type_id, check_in,
check_out, status HOLD|CONFIRMED|CANCELLED|EXPIRED, hold_expires_at, idempotency_key)`.
Availability for a stay = every night in [check_in, check_out) has `total - reserved ≥
rooms`. Reserving is one transaction that, for each night, runs `UPDATE … SET reserved =
reserved + 1 WHERE … AND reserved < total` (or optimistic locking with a version column)
and aborts if any night fails — two simultaneous bookings of the last room can't both
succeed. While a guest is checking out, the reservation is a HOLD that already counts in
`reserved` and expires after ~10 min; an expiry job releases unpaid holds. The reserve API
takes an idempotency key so a retried click never double-books. APIs: `GET
/hotels?city&checkIn&checkOut`, `GET /hotels/{id}/rooms?checkIn&checkOut`, `POST
/reservations` (HOLD), `POST /reservations/{id}/payment`, `DELETE /reservations/{id}`.
Hotel search runs on a search index; hotel details/rates are cached; availability is
always checked against the database.
Numbers (ByteByteGo's sizing): 5,000 hotels, 1 M rooms, ~70 % occupancy, ~3-night stays
→ ~240 K reservations/day ≈ 3 reservations/s; searches ~100× that.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server; m3
web-server → search-index (hotel search); m4 web-server → sql-database (inventory and
reservations in one transaction); m5 web-server → cache (hotel details and rates); m6
web-server → payment-service; m7 web-server → task-scheduler (hold expiry); m8
task-scheduler → worker; m9 worker → sql-database (release expired holds).
Bonus: m10 connect worker → notification-service (confirmation and hold-expiry emails);
m11 add monitoring.
Topology: forbidden client → sql-database; required-between via web-server, from client
to payment-service ("payments are initiated by the backend against a reservation").
Resilience: no-spof web-server; requires-companion task-scheduler ↔ worker.

Reference: client → load-balancer → web-server ×2; each web-server → search-index,
sql-database, cache, payment-service, task-scheduler, monitoring; task-scheduler →
worker → sql-database, notification-service.

### level-46 · Credit Card Processing — Q32 · expert
sourceUrl: https://systemdesign.io/question/design-a-credit-card-processing-system

Tips:
1. To clarify: what level are we implementing. For e.g, are we using Stripe?
2. How will you handle the case where the payment is successful, how will you mark the payment as completed?
3. How will you handle payment failures?
4. How do you ensure that a payment doesn't get processed twice?
5. How do we handle global payments?
6. How do you conduct a large number of transactions?
7. How do you handle a burst of payments?

Resources:
- Detailed solution — https://newsletter.pragmaticengineer.com/p/designing-a-payment-system — article
- Simpler solution — https://hackernoon.com/system-design-interview-designing-payment-systems-follow-up-questions-and-probable-issues — article
- Good video explanation — https://www.youtube.com/watch?v=olfaBgJrUBI — video

Problem / scope (answering tip 1): we are an e-commerce platform's payment system that
uses a payment service provider (PSP, e.g. Stripe/Adyen — the Payment Service component);
we never talk to card networks directly. Correctness points:
- Card details are tokenised in the browser with the PSP's SDK (client → PSP directly), so
  raw card numbers never touch our servers (keeps us out of most PCI scope).
- `POST /payments` requires an idempotency key; the payment row (state machine PENDING →
  SUCCEEDED | FAILED, unique idempotency key) is written **before** calling the PSP, and
  the same key is passed to the PSP so retries never charge twice.
- Success is marked from the PSP's synchronous response **or** its webhook (the PSP calls
  our API asynchronously); both paths apply the same idempotent conditional state update.
  Timeouts/unknown results are resolved by querying the PSP, never by blindly retrying a
  new charge.
- On success, a double-entry ledger records the movement (debit customer receivable,
  credit merchant payable) in the same transaction as the state change, and a
  payment-succeeded event (transactional outbox) triggers downstream work (wallet,
  receipts) via the queue; failures are recorded with the decline reason; retryable
  errors use exponential backoff and finally a DLQ for manual review.
- A fraud score is checked before the charge.
- Global payments: route by currency/region to the right PSP or acquirer, store amounts as
  integer minor units with currency, FX at a quoted rate.
- Volume and bursts: stateless services scale out, the database is sharded by merchant or
  payment id, per-merchant rate limits protect downstream PSPs, and asynchronous
  post-processing absorbs spikes; nightly reconciliation compares the ledger with the PSP's
  settlement files.
Numbers: ~1 M payments/day ≈ 12 TPS average; Black Friday peaks ~100× ≈ 1–2 K TPS; PSP
calls take ~1–3 s.

Missions (required): m1 connect client → payment-service (tokenise the card with the PSP's
SDK); m2 client → api-gateway; m3 api-gateway → web-server (payment API); m4 web-server
→ rate-limiter (per-merchant limits); m5 web-server → ml-model-server (fraud score); m6
web-server → sql-database (payment state + idempotency keys + ledger); m7 web-server →
payment-service (charge with idempotency key); m8 payment-service → api-gateway (PSP
webhooks); m9 web-server → message-queue (payment events via outbox); m10 message-queue →
worker (ledger follow-ups, receipts, status checks for unknown results); m11 worker →
sql-database; m12 worker → payment-service (query status for timed-out payments); m13
message-queue → dead-letter-queue.
Bonus: m14 connect worker → data-warehouse (reconciliation and reporting); m15 add
monitoring.
Topology: forbidden client → sql-database; forbidden client → ml-model-server.
Resilience: no-spof web-server; no-spof worker; requires-companion message-queue ↔
dead-letter-queue.

Reference: client → payment-service; client → api-gateway → web-server ×2; each web-server
→ rate-limiter, ml-model-server, sql-database, payment-service, message-queue, monitoring;
payment-service → api-gateway; message-queue → worker ×2, dead-letter-queue; each worker →
sql-database, payment-service, data-warehouse.

### level-47 · Wire Transfer API — Q47 · hard
sourceUrl: https://systemdesign.io/question/design-and-implement-a-wire-transfer-api

Tips:
1. Similar to the Credit Card Processing question, but with wire transfer. Assume that you are interacting with the banks instead of with the credit card provider.
2. How will you handle concurrent transactions to the same account? Or from the same account?
3. How about scale, say the payment was to a business where there can be many payments simultaneously?

(The page's tip 1 says "Question 22" — the site's own numbering; write "the Credit Card
Processing question" and mention level-46. Tip 2's "hire" is a typo for "handle".)

Resources:
- Leetcode Discussion (Google phone screen) — https://leetcode.com/discuss/interview-question/1895724/google-first-phone-write-a-wiretransfer-api — discussion
- Revolut backend interview discussion — https://leetcode.com/discuss/post/651695/revolut-backend-engineer-london-sep-2019-ybf3/ — discussion
- Video Solution — https://www.youtube.com/watch?v=olfaBgJrUBI&t=365s — video

Problem: `POST /transfers {fromAccountId, toAccount (internal id or bank + account
number), amount, currency, idempotencyKey}` moves money between accounts we hold and to
external banks. Correctness points:
- Strong authentication and authorisation for every money movement.
- One ACID transaction: check idempotency key, lock the sender's account row (or
  conditional update `balance >= amount`), write a transfer row (PENDING) and ledger
  entries that place the funds on hold. Concurrent transfers **from** the same account
  serialise on that row; when two accounts are involved, lock them in a fixed order (by
  id) to avoid deadlocks.
- Transfers **to** a busy business account must not contend on one hot balance row:
  credits are appended as ledger entries (commutative) and the balance is derived from
  entries plus periodic snapshots — or split across sub-accounts; events are partitioned
  by account id so each account's stream is processed in order.
- External legs are submitted to the bank network asynchronously after commit (outbox →
  queue → workers); the bank's confirmation or rejection later moves the transfer to
  COMPLETED, or FAILED with a compensating reversal entry. Never call the bank inside the
  API transaction.
Numbers: ~1 M transfers/day ≈ 12/s, peaks ~500/s on payday; a large merchant account can
receive ~1 K credits/s.

Missions (required): m1 connect client → api-gateway; m2 api-gateway → auth-service; m3
api-gateway → web-server (transfer API); m4 web-server → sql-database (accounts, ledger,
transfers, idempotency keys); m5 web-server → message-queue (transfer events, partitioned
by account); m6 message-queue → worker (bank submission); m7 worker → external-api (bank
network); m8 worker → sql-database (status updates and reversals); m9 message-queue →
dead-letter-queue.
Bonus: m10 connect web-server → ml-model-server (fraud and AML screening); m11 add
monitoring.
Topology: forbidden web-server → external-api ("never call the bank inside the API
request — enqueue after the ledger commit"); forbidden client → sql-database.
Resilience: no-spof web-server; no-spof worker; requires-companion message-queue ↔
dead-letter-queue.

Reference: client → api-gateway → auth-service, web-server ×2; each web-server →
sql-database, message-queue, ml-model-server, monitoring; message-queue → worker ×2,
dead-letter-queue; each worker → external-api, sql-database.

---

## Act 9 (unit C8)

### level-48 · Sorting Large Data Sets — Q21 · easy
sourceUrl: https://systemdesign.io/question/design-a-system-for-sorting-large-data-sets

Tips:
1. How much data do we need to sort?
2. What kind of machines do we have at our disposal?
3. How do you make data reading and writing efficient, because you will be reading and writing data from files.
4. How can we minimize reads and writes to hard drives, because for small data, sorting is done on RAM, and you can't do that with large data.

Resources:
- Excellent solution — https://quanticdev.com/algorithms/distributed-computing/distributed-sorting/ — article
- From the same author, a very detailed video — https://www.youtube.com/watch?v=vgKjatRVtys — video
- Leetcode — https://leetcode.com/discuss/interview-question/4807845/Microsoft-Interview/ — discussion

Problem: sort 10 TB of 100-byte records (10^11 records) stored as files, on a cluster of
commodity machines with 64 GB RAM each — far more data than any machine's memory. The
Client here is the engineer submitting the job. One machine: **external merge sort** —
read RAM-sized chunks, sort each in memory, write each as a sorted run, then k-way merge
the runs with a min-heap, streaming with large sequential buffered reads/writes.
Distributed (TeraSort/MapReduce): sample keys to pick range-partition boundaries; map
tasks read input splits in parallel and partition records by key range (shuffle); each
reduce task sorts its own range (externally if needed) and writes one part file;
concatenating part files in order gives the globally sorted output. Minimising disk I/O:
sequential access only, big buffers, compress runs, high merge fan-in so the data is
read and written as few times as possible (ideally two passes), and keep runs as large as
RAM allows. A coordinator tracks tasks and re-runs only the tasks of a failed machine.
Numbers: 10 TB over 100 machines ≈ 100 GB each; at ~200 MB/s sequential disk throughput,
one pass over 100 GB takes ~8 min, so each extra pass is expensive; the shuffle moves
~10 TB across the network.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server
(job API); m3 web-server → sql-database (job metadata, partition boundaries, progress);
m4 web-server → task-scheduler (coordinator); m5 task-scheduler → batch-processor
(sample, partition, shuffle, merge); m6 batch-processor → blob-storage (read input splits,
write sorted part files); m7 batch-processor → sql-database (task progress, output
manifest).
Bonus: m8 connect batch-processor → notification-service (job finished or failed); m9 add
monitoring.
Topology: forbidden web-server → blob-storage ("don't stream terabytes through the API
server — the cluster reads and writes storage directly").
Resilience: no-spof batch-processor ("sorting needs many machines; a failure re-runs only
its tasks"); requires-companion task-scheduler ↔ batch-processor.

Reference: client → load-balancer → web-server; web-server → sql-database,
task-scheduler, monitoring; task-scheduler → batch-processor ×2; each batch-processor →
blob-storage, sql-database, notification-service.

### level-49 · Top-K Bestsellers — Q22 · easy
sourceUrl: https://systemdesign.io/question/top-k-elements-app-store-rankings-amazon-bestsellers

Tips:
1. What data structure will you use to rank items?
2. How real-time is the ranking?
3. Do you do real-time or a scheduled job?
4. How do you handle this at scale?

Resources:
- Solution from ex-Meta engineer — https://www.youtube.com/watch?v=1lfktgZ9Eeo — video
- Solution from FAANG Engineer — https://www.youtube.com/watch?v=RvZbdYvrFeg — video
- Very detailed solution from Microsoft engineer — https://serhatgiydiren.com/system-design-interview-top-k-problem-heavy-hitters/ — article
- Solution on Blind — https://www.teamblind.com/post/Please-critique-my-system-design-for-Top-K-most-searched-terms-Cfrqhnhk — discussion

Problem: "Top 100 free apps", "Amazon bestsellers in Books" — per category and region,
for the last hour and the last day. Answer to tip 3 is **both** (the heavy-hitters
article's design): a **fast path** of stream processors keeping a count-min sketch plus a
min-heap of size K per category and window — small memory, results within a minute, but
approximate (counts may be overestimated); and a **slow path** where raw events are
stored and a scheduled batch job (MapReduce) computes exact counts and exact top-K for
each completed hour/day, replacing the approximate list. Reads always come from
precomputed lists in the cache. Distinguish from level-23 (sliding windows over article
shares): here the question is precision vs freshness.
Numbers: ~1 B purchase/download events/day ≈ 12 K/s (50 K/s peak); ~10 M items, ~50
categories × ~100 regions; K = 100.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server
(event + rankings API); m3 web-server → message-queue (purchase and download events); m4
message-queue → stream-processor (count-min sketch + heap); m5 stream-processor → cache
(approximate top-K); m6 message-queue → blob-storage (raw events); m7 web-server →
task-scheduler (ranking definitions: category × region × window); m8 task-scheduler →
batch-processor (hourly/daily exact recount); m9 batch-processor → blob-storage; m10
batch-processor → nosql-database (exact rankings); m11 batch-processor → cache (replace
the approximate list); m12 web-server → cache (read rankings).
Bonus: m13 connect cache → nosql-database (fall back to the last exact list on a miss);
m14 add monitoring.
Topology: forbidden client → cache; required-between via message-queue, from web-server to
stream-processor.
Resilience: no-spof web-server; no-spof stream-processor; requires-companion
task-scheduler ↔ batch-processor.

Reference: client → load-balancer → web-server ×2; each web-server → message-queue,
task-scheduler, cache, monitoring; message-queue → stream-processor ×2, blob-storage;
each stream-processor → cache; task-scheduler → batch-processor → blob-storage,
nosql-database, cache; cache → nosql-database.

### level-50 · Job Scheduler — Q23 · easy
sourceUrl: https://systemdesign.io/question/design-a-job-scheduler

Tips:
1. How will you do this on a single machine first?
2. How will you schedule jobs and execute them at the right time?
3. What if there are multiple jobs at the same time?
4. What if a job comes in that needs to be executed very soon?
5. How do you scale it across multiple machines to handle more jobs?

Resources:
- Popular Leetcode Discussion — https://leetcode.com/discuss/general-discussion/1082786/System-Design%3A-Designing-a-distributed-Job-Scheduler-or-Many-interesting-concepts-to-learn — discussion
- Solution from Google Engineer — https://www.youtube.com/watch?v=pzDwYHRzEnk — video
- High Level Overview — https://blog.algomaster.io/p/design-a-distributed-job-scheduler — article
- Mock Interview — https://interviewing.io/mocks/faang-system-design-job-scheduler — video

Problem: users submit jobs to run once at a time T or on a cron schedule, with priorities
and retries; jobs must run on time (within ~1 s) and not be lost. Single machine: a
min-heap ordered by next run time, a timer thread sleeping until the earliest job, and a
worker pool. Distributed: job definitions and `next_run_time` live in SQL; several
scheduler instances each own a shard of jobs (ownership via a coordination service) and
repeatedly claim jobs due in the next few seconds with a lease (conditional update), push
them to a queue (separate priority lanes) and advance `next_run_time` for recurring jobs.
Jobs due sooner than the next polling window are handed to the scheduler directly on
submit. Workers pull runs, execute idempotently, record status, retry with backoff; runs
that keep failing land in a DLQ; a run whose worker dies is re-delivered when its lease or
visibility timeout expires (at-least-once). Many jobs at the same moment are absorbed by
the queue and worker autoscaling.
Numbers: ~100 M scheduled jobs; ~10 K runs/s at peak (the top of each hour spikes ~10×).

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server (job
API); m3 web-server → sql-database (job definitions, next run time, run history); m4
web-server → task-scheduler (jobs due very soon); m5 task-scheduler → sql-database (claim
due jobs with a lease); m6 task-scheduler → message-queue (enqueue runs by priority); m7
message-queue → worker; m8 worker → sql-database (run status, next run); m9 message-queue
→ dead-letter-queue.
Bonus: m10 connect task-scheduler → zookeeper-etcd (shard ownership and leader election);
m11 add monitoring.
Topology: forbidden web-server → worker; required-between via message-queue, from
task-scheduler to worker.
Resilience: no-spof task-scheduler ("a single scheduler is a single point of failure —
run several, each owning shards"); no-spof worker; requires-companion message-queue ↔
dead-letter-queue.

Reference: client → load-balancer → web-server ×2; each web-server → sql-database,
task-scheduler ×2 (both), monitoring; each task-scheduler → sql-database, message-queue,
zookeeper-etcd; message-queue → worker ×2, dead-letter-queue; each worker → sql-database.

### level-51 · Bot Fleet Coordinator — Q52 · hard
sourceUrl: https://systemdesign.io/question/design-a-distributed-botnet

Framing (keep it): the interview's "botnet" is a fleet of machines **you own and operate**
(e.g. the Lyft variant: bots that download a large set of files) that must be coordinated
to finish one job. Do not describe malware, infection, evasion or attacking anyone — the
level is about master/worker coordination.

Tips (the page's bullets, without its "To consider:" heading):
1. It is essentially the same as coordinating a bunch of machines towards doing a particular task, and tracking it.
2. You can take the MapReduce template - master-workers, heartbeats for tracking tasks, etc.
3. How will you send a task to the cluster of computers?
4. How will you keep track of each computer's task?
5. What will you do if a computer fails? How will you get notified?
6. How will you know when all the computers have completed the task?

Resources:
- MapReduce Paper - which coordinates a cluster of machines to do a task — https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf — paper
- Leetcode Discussion — https://leetcode.com/discuss/post/1375361/botnet-system-designfacebook-design-roun-jv0g/ — discussion
- Lyft: design bots to download files (discussion) — https://leetcode.com/discuss/post/850071/lyft-virtual-onsite-design-bots-to-downl-4v5q/ — discussion
- Blind — https://www.teamblind.com/post/System-design-for-Botnet-5x0Mq34z — discussion

Design (MapReduce's master/worker template): the operator (the Client) submits a job; the
coordinator splits it into tasks, records them in SQL (task, state, assigned bot, attempt)
and publishes them to a task queue; bots **pull** tasks (scales to thousands, works behind
NAT), run them, write outputs to object storage, and report completion back to the
coordinator. Liveness: each bot holds a session/lease in a coordination service
(ZooKeeper/etcd) kept alive by heartbeats; when a session expires the coordinator is
notified (watch) and re-queues that bot's in-flight tasks; tasks are idempotent so a
re-run is safe; stragglers near the end get speculative backup copies. Completion: the
job is done when every task is marked done (a counter of remaining tasks reaching zero).
The coordinator itself is replicated: a standby takes over via leader election, and job
state survives because it is in the database.
Numbers: 10 K bots; a job of 10 M tasks of ~1 s each ≈ 1,000 s of fleet time; heartbeats
every 5 s ≈ 2 K/s; a bot is declared dead after ~3 missed heartbeats (~15 s).

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server
(coordinator: submit, split, track); m3 web-server → sql-database (jobs, tasks,
assignments); m4 web-server → message-queue (task queue); m5 message-queue → worker (bots
pull tasks); m6 worker → zookeeper-etcd (membership and heartbeats); m7 web-server →
zookeeper-etcd (leader election; watch for dead bots); m8 worker → blob-storage (task
outputs); m9 worker → web-server (report completion).
Bonus: m10 connect web-server → notification-service (tell the operator when the job
completes or fails); m11 add monitoring.
Topology: forbidden client → worker; forbidden client → message-queue.
Resilience: no-spof web-server ("run a standby coordinator"); no-spof worker; no-spof
zookeeper-etcd ("run a quorum ensemble").

Reference: client → load-balancer → web-server ×2; each web-server → sql-database,
message-queue, zookeeper-etcd ×2 (both), notification-service, monitoring; message-queue
→ worker ×2; each worker → zookeeper-etcd ×2 (both), blob-storage, web-server ×2 (both).

### level-52 · Cloud Data Migration — Q51 · expert
sourceUrl: https://systemdesign.io/question/create-a-system-to-migrate-large-data-to-google-cloud

Tips:
1. How will you structure the migration? Which machine manages it?
2. How do we ensure no data is lost in the process?
3. How will you ensure that the file's data didn't change in transit?
4. What are some strategies to speed up the transfer?

Resources:
- 3 strategies — https://newrelic.com/blog/best-practices/migrating-data-to-cloud-avoid-downtime-strategies — article
- Related interview experience — https://leetcode.com/discuss/post/1733573/rubrik-file-transfer-interview-question-43hjl/ — discussion

Problem: move ~5 PB (~2 B files) from an on-premises file store into Google Cloud Storage
while the source stays in use, with zero data loss and verified integrity. The Client is
the migration operator's console. Two Blob Storage nodes: one is the on-prem source, one
is the GCS destination (say so in the narrative). Design: a migration controller builds a
**manifest** (path, size, mtime, checksum, state per file/chunk) in SQL by listing the
source, splits it into transfer tasks and enqueues them; many transfer agents running next
to the source pull tasks, read files, and upload them (large files as parallel multipart /
composite uploads, resumable), computing CRC32C/MD5 on the source bytes and comparing with
the checksum GCS reports for the stored object — a mismatch fails the task and it is
retried. Agents record every verified file in the manifest, so the migration resumes
exactly where it stopped. No data loss: the manifest is the source of truth; a final
reconciliation compares source and destination listings (count, sizes, checksums); the
source is never deleted until verification passes. Files changing during the copy are
caught by scheduled **delta sync** passes (changed mtime/size/checksum) until a short
write freeze for cutover. Speed: parallel agents and streams, compression for
compressible data, bandwidth throttling to protect production, a dedicated interconnect,
and for multi-petabyte sets offline Transfer Appliances.
Numbers: 5 PB over a 10 Gbps link (~1.25 GB/s ≈ 108 TB/day) ≈ 46 days at full line rate;
a 100 Gbps interconnect ≈ 5 days; ~2 B files → ~460 files/s just to keep up over 50 days.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server
(migration controller); m3 web-server → sql-database (manifest); m4 web-server →
message-queue (transfer tasks); m5 message-queue → worker (transfer agents); m6 worker →
blob-storage (read the source, write the destination with checksums); m7 worker →
sql-database (record verified files); m8 message-queue → dead-letter-queue; m9 web-server
→ task-scheduler (delta-sync passes until cutover); m10 task-scheduler → message-queue.
Bonus: m11 connect worker → rate-limiter (bandwidth throttling to protect production);
m12 add monitoring.
Topology: forbidden web-server → blob-storage ("data moves agent-to-bucket, never through
the controller"); required-between via message-queue, from web-server to worker.
Resilience: no-spof worker; requires-companion message-queue ↔ dead-letter-queue;
requires-companion task-scheduler ↔ message-queue.

Reference: client → load-balancer → web-server; web-server → sql-database, message-queue,
task-scheduler, monitoring; task-scheduler → message-queue; message-queue → worker ×2,
dead-letter-queue; each worker → blob-storage ×2 (both: source and destination),
sql-database, rate-limiter.

---

## Act 10 (unit C9)

### level-53 · File Downloader — Q43 · hard
sourceUrl: https://systemdesign.io/question/design-a-file-downloader-library

Tips:
1. Backend: what does the API look like?
2. How do you do this at scale?
3. How can you support large files?
4. How can you utilize cache for popular files?

Resources:
- Leetcode Discussion — https://leetcode.com/discuss/interview-question/system-design/1587255/Facebook-System-Design — discussion
- Video Solution — https://www.youtube.com/watch?v=u520bdagKkU — video

Problem: a client library (in the app) plus the backend it talks to, for downloading
files from KB to tens of GB: progress, pause/resume, survive flaky networks, verify
integrity. Library: fetch metadata first (`GET /files/{id}` → size, SHA-256, chunk size,
a short-lived signed download URL); download fixed-size chunks (e.g. 8 MB) with HTTP
**Range** requests (`206 Partial Content`) over a few parallel connections; persist
which chunks are done so a pause, crash or network switch resumes from the last
completed chunk; retry failed chunks with exponential backoff and jitter; verify the
final hash; refresh the signed URL when it expires. Backend: the API never streams file
bytes — it authorises the request, returns metadata and signs a URL; the bytes come from
the CDN, whose edges cache popular files (most traffic is a small set of hot files) and
fetch misses from object storage. Per-user download quotas throttle abuse.
Numbers: ~10 M downloads/day averaging ~200 MB ≈ 2 PB/day ≈ 185 Gbps of egress; the top
5 % of files account for ~80 % of bytes, so the CDN hit ratio should exceed 90 %.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server
(metadata and signed-URL API); m3 web-server → auth-service (authorise and sign the URL);
m4 web-server → sql-database (file metadata: size, hash, chunk size, ACL); m5 web-server
→ cache (hot metadata); m6 client → cdn (ranged chunk downloads); m7 cdn → blob-storage
(origin).
Bonus: m8 connect web-server → rate-limiter (per-user download quotas); m9 add monitoring.
Topology: forbidden web-server → blob-storage ("don't stream file bytes through the API
servers — hand out signed URLs and let the CDN serve range requests").
Resilience: no-spof web-server; requires-companion blob-storage ↔ cdn.

Reference: client → cdn → blob-storage; client → load-balancer → web-server ×2; each
web-server → auth-service, sql-database, cache, rate-limiter, monitoring.

### level-54 · Peer-to-Peer File Transfer (BitTorrent) — Q53 · hard
sourceUrl: https://systemdesign.io/question/create-a-distributed-file-transfer-system-like-bittorrent

Tips:
1. How will you ensure that a file is hosted on the system reliably, even if one machine goes down?
2. If a user wants to download a file, how do you locate the machine that holds it?
3. You probably need some sort of ledger or metadata table, how will you store that?
4. How will you make sure that a download is completed?
5. When a machine is added, how do you scale the cluster?
6. How do you secure the files and ensure no one modifies them?

Resources:
- Great paper on this topic — https://web.cs.ucla.edu/classes/cs217/05BitTorrent.pdf — paper
- Article on this — https://medium.com/@abhinavcv007/bittorrent-part-1-the-engineering-behind-the-bittorrent-protocol-04e70ee01d58 — article
- High Level Video Explanation — https://www.youtube.com/watch?v=6PWUCFmOQwQ — video

Problem: distribute large files to many users where the users' machines (peers) do most
of the uploading. Use **two Client nodes** ("Peer A", "Peer B") wired to each other —
peers exchange pieces directly. Design: a file is split into pieces (256 KB–4 MB); its
metainfo lists each piece's hash (SHA-1 in v1, a SHA-256 Merkle tree in v2) and is
identified by the info-hash; the publisher signs the metainfo. Locating holders: the
tracker maps info-hash → current peers (peers re-announce periodically, entries expire);
a DHT (Kademlia) removes the tracker as a single point. Metadata ledger: torrents
(info-hash, piece hashes, size, signature, seeding status) in a key-value store. Peers
download rarest pieces first from several peers at once, reciprocate uploads
(tit-for-tat), verify every piece's hash before accepting it — a tampered or corrupt
piece is discarded and re-fetched — and the download is complete when all piece hashes
verify. Reliability: keep at least ~3 seeders per file — operator-run seed boxes start
seeding under-replicated torrents, and an HTTP web seed (CDN over object storage) is the
fallback. Scaling: a new machine just announces and joins the swarm; trackers are sharded
by info-hash.
Numbers: a popular 4 GB file in 4 MB pieces = 1,000 pieces; swarms of 10 K+ peers;
announces every ~30 min per peer per torrent.

Missions (required): m1 connect client → client (peers exchange pieces directly); m2
client → load-balancer; m3 load-balancer → web-server (tracker announce/scrape); m4
web-server → cache (swarm membership: info-hash → peers, with TTL); m5 web-server →
nosql-database (torrent metadata and piece hashes); m6 client → cdn (web seed fallback,
range requests); m7 cdn → blob-storage; m8 web-server → message-queue (under-replicated
torrent events); m9 message-queue → worker (seed boxes); m10 worker → blob-storage (read
the content they seed).
Bonus: m11 connect worker → web-server (seed boxes announce themselves to the tracker);
m12 add monitoring.
Topology: forbidden client → nosql-database; required-between via web-server, from client
to cache.
Resilience: no-spof web-server ("run several trackers"); no-spof worker ("at least two
seed boxes"); requires-companion blob-storage ↔ cdn.

Reference: client "Peer A" → client "Peer B"; client "Peer B" → client "Peer A"; each
client → load-balancer, cdn; load-balancer → web-server ×2; each web-server → cache,
nosql-database, message-queue, monitoring; cdn → blob-storage; message-queue → worker ×2;
each worker → blob-storage, web-server ×2 (both).

### level-55 · Cluster Health Monitor — Q39 · medium
sourceUrl: https://systemdesign.io/question/design-a-system-to-monitor-the-health-of-a-cluster

Tips:
1. What metrics will you track for health?
2. How will you collect those metrics? Will you utilize a heartbeat?
3. How will you log the status of each metric?
4. What will you do if a metric is down? Will you have an action for each metric? For example, if a cluster is not responding, will you ask for a restart?
5. How will you display the monitoring to the user? Through a dashboard?

Resources:
- Good starting point: Interview experience — https://medium.com/%40ajingnv/system-design-a-server-health-monitoring-system-9bdd0066bb9c — article
- Solution — https://systemdesignschool.io/problems/realtime-monitoring-system/solution — article
- Leetcode Discussion — https://leetcode.com/discuss/interview-question/system-design/958919/System-Design-Interview-or-Service-Health-Monitoring-and-Alerting-Service — discussion

Problem: know within ~30 s when any node or service in a cluster is unhealthy, alert the
on-call, fix common failures automatically, and show the cluster's state on a dashboard.
Unlike level-21 (metrics collection at scale), the focus is **failure detection and
automated action**. The Client here is both the agents on every cluster node and the
engineers opening the dashboard (say so). Metrics: liveness heartbeat, CPU, memory, disk
space, disk/network errors, process up, request error rate and latency. Collection: an
agent on each node pushes a heartbeat plus metrics every 10 s; a node missing 3
heartbeats is suspected down (confirm with an active probe before acting, to avoid false
positives from a network blip). Status: every metric point goes to the time-series DB,
and the current health state per node/service (last heartbeat, status, since when) is
kept in the cache for the status board; every state change is logged. Rules: each metric
has thresholds over a window and an action — page the on-call, and/or run a remediation
runbook (restart the process, drain and replace the node) through workers, with safety
limits (never auto-restart more than a few % of the cluster at once). Dashboard: status
board + charts.
Numbers: 10 K nodes × (1 heartbeat + ~100 metrics) every 10 s ≈ 100 K points/s; detection
target ≤ 30 s; ~200 engineers on the dashboard.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server
(ingest + dashboard API); m3 web-server → message-queue (heartbeats and metrics); m4
message-queue → stream-processor (failure detector and rules); m5 stream-processor →
timeseries-db; m6 stream-processor → cache (current health state per node); m7
stream-processor → notification-service (page the on-call); m8 stream-processor →
message-queue (remediation actions); m9 message-queue → worker (runbooks: restart, drain,
replace); m10 web-server → timeseries-db (dashboard charts); m11 web-server → cache
(status board).
Bonus: m12 connect worker → sql-database (audit log of every automated action); m13
timeseries-db → blob-storage (downsample and archive).
Topology: required-between via message-queue, from web-server to stream-processor;
forbidden web-server → worker ("remediation is triggered by the rules engine, not by the
ingest path").
Resilience: no-spof web-server; no-spof stream-processor ("the failure detector must not
itself be a single point of failure"); requires-companion stream-processor ↔ cache.

Reference: client → load-balancer → web-server ×2; each web-server → message-queue,
timeseries-db, cache; message-queue → stream-processor ×2, worker; each stream-processor →
timeseries-db, cache, notification-service, message-queue; worker → sql-database;
timeseries-db → blob-storage.

### level-56 · Distributed Tracing — Q41 · expert
sourceUrl: https://systemdesign.io/question/design-a-distributed-tracing-system

Tips:
1. How will you collect information from various parts of your backend?
2. Where will you send the info and how will you store it?
3. How will you map a trace for a particular request? Will you use a request id, or something else?
4. If an error happens, how will you surface relevant information to the system admin?
5. How will you handle machines going down?

Resources:
- Leetcode Discussion — https://leetcode.com/discuss/interview-question/system-design/313117/Design-a-system-capable-of-tracking-bad-request-down-quickly — discussion
- Great intro to Tracing — https://betterstack.com/community/guides/observability/distributed-tracing/ — article
- Dapper research paper — https://research.google/pubs/pub36356/ — paper
- Solution from FAANG engineer — https://www.youtube.com/watch?v=Jkhw_FSikX0 — video

Problem: follow a single request across hundreds of microservices to find where it was
slow or failed. The Web Server tier here stands for all the instrumented services; the
same tier also hosts the trace query API that engineers use (say so). Design (Dapper,
OpenTelemetry): the edge assigns a **trace id**; every service propagates it (W3C
`traceparent` header) and records **spans** (span id, parent span id, service, operation,
start, duration, status, tags) through an instrumentation library; spans are buffered and
exported asynchronously to a nearby collector so tracing never blocks or fails a request
(when the collector is unreachable, spans are dropped, not retried forever). Sampling:
head-based (e.g. 1 %) to bound volume, plus tail-based decisions in the processing tier
that keep every trace with an error or high latency. Collectors batch spans into a log
partitioned by trace id; stream processors assemble spans into traces, apply tail
sampling, write traces to a wide-column store keyed by trace id and index searchable
fields (service, operation, status, duration) in a search index. Errors surface as alerts
on new error signatures or error-rate spikes linking to example trace ids, and in the UI's
waterfall view. Machines going down: collectors are stateless behind a load balancer, the
log is replicated, and losing a small fraction of spans is acceptable.
Numbers: 1 M requests/s × ~20 spans ≈ 20 M spans/s unsampled; 1 % head sampling + all
errors ≈ 200 K spans/s × ~500 B ≈ 100 MB/s ≈ 8.6 TB/day; 7 days hot retention.

Missions (required): m1 connect client → load-balancer; m2 load-balancer → web-server
(instrumented services + trace query API); m3 web-server → trace-collector (async span
export); m4 trace-collector → message-queue (spans partitioned by trace id); m5
message-queue → stream-processor (assemble traces, tail sampling); m6 stream-processor →
nosql-database (traces by trace id); m7 stream-processor → search-index (searchable
fields); m8 stream-processor → notification-service (alert on error spikes with example
trace ids); m9 web-server → search-index (find traces); m10 web-server → nosql-database
(fetch a full trace).
Bonus: m11 connect nosql-database → blob-storage (age out to cold storage); m12 add
monitoring.
Topology: required-between via trace-collector, from web-server to message-queue
("services export spans to a collector, never straight into the log"); forbidden
web-server → stream-processor.
Resilience: no-spof trace-collector; no-spof stream-processor; requires-companion
message-queue ↔ stream-processor.

Reference: client → load-balancer → web-server ×2; each web-server → trace-collector ×2
(both), search-index, nosql-database, monitoring; each trace-collector → message-queue;
message-queue → stream-processor ×2; each stream-processor → nosql-database,
search-index, notification-service; nosql-database → blob-storage.

### level-57 · Distributed Database Control Plane — Q34 · expert
sourceUrl: https://systemdesign.io/question/design-a-control-plane-for-a-distributed-database

Tips:
1. What are the core functionalities of your DB's control plane? E.g, provisioning, configuration management, monitoring, scaling, backups, etc.
2. How does your DB manage creating and managing new tables?
3. How does your DB handle scaling?
4. How does your DB handle authentication?
5. How about monitoring and alerts? What is monitored?

Resources:
- What a control plane is (video) — https://www.youtube.com/watch?v=Ep1QW-wOmgc — video
- DynamoDB Paper — https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf — paper

(The second link is the 2007 Dynamo paper — the predecessor of DynamoDB; titling it "Dynamo
paper (Amazon, 2007)" is more accurate. Use that title.)

Problem: design the control plane of a DynamoDB-like managed database. The **data plane**
(request routers + storage nodes) serves reads and writes; the **control plane** handles
everything else: create/update/delete tables, configuration, partition placement,
scaling (split hot or large partitions, add nodes, move replicas), backups/restore,
authentication and authorisation, health and monitoring. Key principle: the data plane
must keep serving if the control plane is down (static stability) — routers cache the
partition map and never call the control plane per request. Design: the management API
authenticates every call (IAM-style policies, API keys) and records the desired state
(tables, schema, capacity, partitions, operations) in a strongly consistent metadata
database; long-running operations (CreateTable → CREATING → ACTIVE, partition split,
backup) run as idempotent, resumable workflows on workers that drive storage nodes and
publish the new partition map to a consensus-backed config store (ZooKeeper/etcd), which
request routers watch. Scaling: monitor per-partition size and throughput; split
partitions beyond ~10 GB or hot keys' throughput; rebalance replicas when nodes are added.
Backups: snapshots to object storage (point-in-time recovery from logs). Monitoring:
storage nodes report health, latency, throttling, storage and replication lag; alerts
page the on-call.
Numbers: ~100 K tables; ~1 K control-plane operations/min; data plane ~10 M requests/s
across ~10 K storage nodes, 3 replicas per partition.

Missions (required): m1 connect client → api-gateway (management API); m2 api-gateway →
auth-service; m3 api-gateway → web-server (control-plane service); m4 web-server →
sql-database (metadata, desired state, operations); m5 web-server → message-queue
(long-running operations); m6 message-queue → worker (workflow engine); m7 worker →
nosql-database (provision, split, move partitions on storage nodes); m8 worker →
zookeeper-etcd (publish the partition map); m9 worker → blob-storage (backups); m10 client
→ load-balancer (data-plane traffic); m11 load-balancer → reverse-proxy (request routers);
m12 reverse-proxy → zookeeper-etcd (watch the partition map); m13 reverse-proxy →
nosql-database.
Bonus: m14 connect nosql-database → monitoring (node health and per-table metrics); m15
monitoring → notification-service (page the on-call).
Topology: forbidden reverse-proxy → web-server ("the data path must not depend on the
control plane"); forbidden reverse-proxy → sql-database ("routers read the partition map
from the config store, not the metadata database").
Resilience: no-spof reverse-proxy; no-spof nosql-database ("replicate every partition");
no-spof zookeeper-etcd ("run a quorum"); requires-companion message-queue ↔ worker.

Reference: client → api-gateway → auth-service, web-server; web-server → sql-database,
message-queue; message-queue → worker; worker → nosql-database ×2 (both), zookeeper-etcd ×2
(both), blob-storage; client → load-balancer → reverse-proxy ×2; each reverse-proxy →
zookeeper-etcd ×2 (both), nosql-database ×2 (both); each nosql-database → monitoring;
monitoring → notification-service.
