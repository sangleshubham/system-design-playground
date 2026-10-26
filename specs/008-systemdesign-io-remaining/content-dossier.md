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
