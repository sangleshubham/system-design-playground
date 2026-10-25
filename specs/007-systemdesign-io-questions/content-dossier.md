# Content dossier — Feature 007

Verbatim record of the source pages (fetched 2026-10-26) plus the per-level architecture
that content authors MUST encode. Tips are the page's "Here are some details you should
know about this question" bullets (obvious typos fixed; `[r]` = bullet was truncated in the
extraction and is reconstructed). Resource `title` = the page's label. No source page has
a problem statement or solution of its own — narratives are authored.

## Authoring rules (apply to every level)

- Follow the existing level JSON style (`backend/content/levels/level-1.json`): `summary`
  one sentence; `narrative` 3 paragraphs separated by `\n\n`; `objectives` 3–4 chips;
  `specs` with functional / nonFunctional / constraints / capacity / tradeoff / bonus;
  3 progressive `hints` (last one gives away the remaining structure).
- Narrative + specs must state the question's requirements and back-of-envelope numbers
  (given below where they are standard) and must explain any non-obvious mapping, e.g.
  "the Client here is the producer service".
- `tips` = the bullets below, in order. `resources` = the links below, in order,
  with the given `kind`. `sourceUrl` = the question page.
- `recommendedComponentIds` = every component in the reference design (+ bonus ones).
- Missions use only the semantics in `backend/src/services/mission.service.ts`
  (`add` = component present; `connect` = an edge from a node of type A to a node of type B).
  Mission ids `m1..mN` in order; bonus missions last.
- Reference design (tests-only) at `backend/tests/content/solutions/<level-id>.json`
  satisfies every mission (bonus included), topology and resilience rule, and every node
  is reachable from a Client. "×2" = two nodes of that component, each wired identically.
- `specs.budgetPerHr` ≥ reference cost; set it ≈ 1.2–1.3 × reference cost, rounded up to
  the nearest 0.5. `specs.latencyTargetMs` ≥ the reference critical path as computed by
  `backend/src/services/scoring/efficiency.rule.ts` (longest latency sum over ANY
  Client-rooted path, async branches included) with 10–25 % headroom, rounded to 10 ms.
  For existing levels keep the current budget/target unless the reference needs more.
- Hints must not contradict the topology rules; hints and narrative must not contradict
  the tips or the linked resources.

## New components (unit U2)

| id | name | tech | category | costPerHr | latencyMs | icon | description |
|---|---|---|---|---|---|---|---|
| `key-generation-service` | Key Generation Service | Pre-generated base62 keys (KGS) | services | 0.2 | 2 | `tile-key-generation-service` | Pre-generates unique short keys offline and hands them to app servers in batches, so writes never collide or race on ID creation. |
| `geo-index` | Geospatial Index | QuadTree / Geohash (PostGIS, Redis GEO) | storage | 0.5 | 8 | `tile-geo-index` | Spatial index that answers "what is near this point?" by bucketing locations into geohash cells or quadtree nodes. |

## Acts (C1 writes acts.json)

| id | order | title | description |
|---|---|---|---|
| act-1 | 1 | The Fundamentals | (keep) |
| act-2 | 2 | Async & Real-Time | (keep) |
| act-3 | 3 | Social, Media & Places | Photo feeds, timelines, file sync, calendars and location search — the classic product-design interview questions. |
| act-4 | 4 | Data Infrastructure | Build the plumbing everyone else depends on: queues, logs, metrics, analytics and real-time ranking pipelines. |

## Level map

| order | id | act | title | difficulty | source Q |
|---|---|---|---|---|---|
| 1 | level-1 | act-1 | The Static App | easy | — |
| 2 | level-2 | act-1 | The 3-Tier Web App | easy | — |
| 3 | level-3 | act-1 | URL Shortener | medium | Q1 |
| 4 | level-13 | act-1 | Pastebin | easy | Q2 |
| 5 | level-4 | act-1 | Rate Limiter | medium | Q9 |
| 6 | level-5 | act-1 | Distributed Key-Value Store | medium | Q12 |
| 7 | level-6 | act-1 | Notification System | medium | — |
| 8 | level-7 | act-1 | Unique ID Generator | hard | — |
| 9 | level-8 | act-2 | Real-Time Chat (WhatsApp / Messenger) | hard | Q5 |
| 10 | level-9 | act-2 | News Feed | hard | Q15 |
| 11 | level-10 | act-2 | Search Autocomplete | expert | Q8 |
| 12 | level-11 | act-2 | Web Crawler | expert | Q14 |
| 13 | level-12 | act-2 | Video Streaming Platform | legendary | Q7 |
| 14 | level-14 | act-3 | Instagram | easy | Q3 |
| 15 | level-15 | act-3 | Twitter | easy | Q6 |
| 16 | level-16 | act-3 | Dropbox / Google Drive | medium | Q4 |
| 17 | level-17 | act-3 | Google Calendar | medium | Q18 |
| 18 | level-18 | act-3 | Yelp / Nearby Friends | expert | Q16 |
| 19 | level-19 | act-4 | Distributed Message Queue | hard | Q19 |
| 20 | level-20 | act-4 | Distributed Log (Kafka) | expert | Q11 |
| 21 | level-21 | act-4 | Metrics Collection at Scale | hard | Q17 |
| 22 | level-22 | act-4 | Distributed Logging & Search | expert | Q10 |
| 23 | level-23 | act-4 | Top-K Shared Articles | hard | Q13 |
| 24 | level-24 | act-4 | Web Analytics Pipeline | hard | Q20 |

Levels level-1, level-2, level-6, level-7: content unchanged except `order`/`actId` per the
map; they only gain a reference solution.

---

## Act 1–2 upgrades and Pastebin (unit C1)

### level-3 · URL Shortener — Q1
sourceUrl: https://systemdesign.io/question/design-url-shortening-service-like-tinyurl

Tips:
1. How do you generate a unique short ID?
2. How do you avoid collisions?
3. How do we prevent malicious links, phishing, or spam?
4. Do we rate-limit requests from abusive clients?
5. Do we support link expiration or deletion?
6. How do we store logs for analytics?
7. Should we cache frequently accessed short URLs? Where? (Redis, CDN)
8. How do we handle hot keys (very popular links)?

Resources:
- Good overview — https://medium.com/%40sandeep4.verma/system-design-scalable-url-shortener-service-like-tinyurl-106f30f23a82 — article
- Good solution — http://designgurus.io/blog/url-shortening — article
- Neetcode solution — https://www.youtube.com/watch?v=qSJAvd5Mgio — video
- Another solution — https://blog.algomaster.io/p/design-a-url-shortener — article

Changes: keep all existing missions/rules. Add required missions
`add key-generation-service`, `connect web-server → key-generation-service`. Bonus:
keep `add bloom-filter`; add `connect web-server → message-queue` ("Stream click events to a
Message Queue for analytics"). Add resilience `no-spof key-generation-service` ("The KGS
hands out every key — run a standby so it isn't a single point of failure"). Narrative /
specs: 100:1 read:write, base62 7-char keys (62^7 ≈ 3.5 trillion), 301 vs 302 redirect
trade-off (302 keeps analytics), optional expiry. Hint 3 may mention the CDN for hot links.

Reference: client → load-balancer → web-server ×2; each web-server → cache, nosql-database,
key-generation-service (×2, both), bloom-filter, message-queue; cache → nosql-database.

### level-13 · Pastebin (new) — Q2 · easy
sourceUrl: https://systemdesign.io/question/design-pastebin

Tips:
1. Large pastes: limit the size per paste, and use chunked storage if needed.
2. Expiration: store a TTL in the database and run background cleanup jobs.
3. Anonymous vs. registered users: think about access control, rate limits, and abuse prevention.
4. Unique IDs: generate a random string or hash, or use an incremental counter encoded in base62.

Resources:
- Good solution — https://medium.com/codex/designing-pastebin-77e6e86172eb — article
- Good 20-minute video — https://www.youtube.com/watch?v=V_yOcipUqUE — video
- Alternate solution — https://ujjwalbhardwaj.me/post/system-design-design-pastebin-text-storage-system — article

Problem: users paste text (≤ 10 MB) and get a unique short URL; anyone with the URL can
read it; pastes expire (default or user-chosen); anonymous and registered users.
Numbers: ~1 M new pastes/day (~12 writes/s), 5:1 read:write (~58 reads/s), average paste
~10 KB → ~10 GB/day, ~36 TB over 10 years. Key insight: metadata (key, owner, expiry,
blob pointer) in a key-value store, paste bodies in object storage.

Missions (required): add client; connect client → load-balancer; load-balancer → web-server;
web-server → key-generation-service; web-server → nosql-database (metadata);
web-server → blob-storage (paste content); web-server → cache (hot pastes);
web-server → task-scheduler (register expiry); task-scheduler → worker; worker → blob-storage
(delete expired content).
Bonus: connect web-server → rate-limiter (throttle anonymous writes); add monitoring.
Topology: forbidden client → nosql-database; forbidden client → blob-storage;
required-between via web-server, from client to nosql-database.
Resilience: no-spof web-server; requires-companion nosql-database ↔ cache;
requires-companion task-scheduler ↔ worker.

Reference: client → load-balancer → web-server ×2; each web-server → key-generation-service,
nosql-database, blob-storage, cache, task-scheduler, rate-limiter, monitoring;
cache → nosql-database; task-scheduler → worker → blob-storage; worker → nosql-database.

### level-4 · Rate Limiter — Q9
sourceUrl: https://systemdesign.io/question/design-an-api-rate-limiter

Tips:
1. How to identify users to rate limit?
2. What algorithm do you use for rate limiting?
3. How about in a distributed system - how do you scale this in large distributed website?
4. How to make your rate limiter fault tolerant?

Resources:
- Great article + mock interview video — https://www.tryexponent.com/blog/rate-limiter-system-design — article
- Great solution by Google engineer — https://www.youtube.com/watch?v=VzW41m4USGs — video
- Intro — https://blog.bytebytego.com/p/rate-limiting-fundamentals — article
- Good article on algorithms — https://medium.com/geekculture/system-design-design-a-rate-limiter-81d200c9d392 — article
- Leetcode discussion — https://leetcode.com/discuss/interview-question/system-design/1616482/System-Design%3A-Rate-Limiter — discussion

Changes: keep missions/rules. Add resilience `no-spof rate-limiter` (the limiter sits on
every request; one instance is a SPOF). Narrative/specs: identify by API key / user id /
IP; token bucket vs leaky bucket vs fixed window vs sliding-window log/counter; shared
counters in Redis with atomic INCR/Lua; fail-open vs fail-closed; HTTP 429 +
`Retry-After` / `X-RateLimit-*` headers.

Reference: client → load-balancer → rate-limiter ×2; each rate-limiter → cache and →
web-server ×2 (both); each web-server → sql-database; web-server → monitoring.

### level-5 · Distributed Key-Value Store — Q12
sourceUrl: https://systemdesign.io/question/design-a-keyvalue-store

Tips:
1. How will you distribute the data via partitioning?
2. How will you make sure the data is not lost (replication)?
3. How will you ensure fault tolerance?
4. Know your CAP Theorem basics - is your store CA or CP or AP? And why?
5. How will you handle concurrent reads or writes?

Resources:
- Good high level solution — https://www.educative.io/courses/grokking-the-system-design-interview/design-of-a-key-value-store — course
- Mock Interview with Microsoft Engineer — https://www.youtube.com/watch?v=6fOoXT1HYxk — video
- Detailed Video Series on this — https://www.youtube.com/playlist?list=PL1MM4yIzUdPm2L_Lz8gRa_q6ZElgNoArH — video

Changes: missions/rules unchanged. Narrative/specs: consistent hashing with virtual nodes,
replication factor N with quorum R + W > N, AP (Dynamo-style, eventual consistency with
vector clocks / last-write-wins) vs CP choice, hinted handoff, anti-entropy (Merkle trees).
A hint may note that Dynamo-style stores use gossip instead of a coordinator — the
ZooKeeper/etcd shard map is this level's chosen approach.

Reference: client → load-balancer → web-server ×2; each web-server → nosql-database ×2
(both), zookeeper-etcd, cache; web-server → monitoring.

### level-8 · Real-Time Chat (WhatsApp / Messenger) — Q5
sourceUrl: https://systemdesign.io/question/design-facebook-messenger-or-whatsapp

Tips:
1. How do you ensure low-latency message delivery (< 100ms) across millions of users?
2. What communication protocol will you use (long polling, WebSockets)?
3. How do you handle offline users and guarantee eventual delivery?
4. Where do you store messages - do you persist all, or support auto-deletion?
5. How will you implement push notifications on iOS/Android reliably?
6. How do you support multi-device sync (message states consistent across devices)?
7. How will you manage group messaging - fan-out on write vs fan-out on read?

Resources:
- Good overview — https://hayksimonyan.substack.com/p/system-design-interview-design-whatsapp — article
- Good solution — https://medium.com/%40m.romaniiuk/system-design-chat-application-1d6fbf21b372 — article
- Real time chat — https://medium.com/%40ishwarya1011.hidkimath/system-design-design-a-chat-system-e0056fb093d1 — article
- Great video — https://www.youtube.com/watch?v=-3Ge8EooS3g — video

Changes: title → "Real-Time Chat (WhatsApp / Messenger)". Keep existing missions/rules; add
required missions `connect message-queue → worker` and `connect worker → notification-service`
(offline recipients get an APNs/FCM push). Narrative: sent/delivered/read receipts,
per-conversation sequence numbers for multi-device sync, small groups fan-out on write.
Raise `latencyTargetMs` if the reference critical path requires it; the nonFunctional
spec still states < 100 ms delivery for online users.

Reference: client → load-balancer → websocket-server ×2; each websocket-server → pub-sub,
cache, message-queue; message-queue → nosql-database; message-queue → worker →
notification-service; websocket-server → monitoring.

### level-9 · News Feed — Q15
sourceUrl: https://systemdesign.io/question/design-facebooks-news-feed

Tips:
1. How will you handle fanout: push model, pull model, or hybrid? How does the system change for a user with millions of friends/followers?
2. How will you fetch and score new content at scale - especially when a user opens the app after days?
3. How will you handle the scalability of writes and reads - e.g., batching, caching, partitioning?

Resources:
- Good solution — https://www.hellointerview.com/learn/system-design/problem-breakdowns/fb-news-feed — article

Changes: missions/rules unchanged. Narrative/specs/hints must present the hybrid model:
fan-out on write for normal users, fan-out on read (merge at request time from the post
store) for celebrities; precomputed feed may be stale after days away → fall back to
pull + rank.

Reference: client → load-balancer → web-server ×2; each web-server → nosql-database,
message-queue, cache; message-queue → worker; worker → graph-database, cache;
client → cdn → blob-storage.

### level-10 · Search Autocomplete — Q8
sourceUrl: https://systemdesign.io/question/design-typeahead-suggestion-autocomplete

Tips:
1. How will you store queries to support prefix-based lookup?
2. What data structure will you use for fast suggestions (Trie, inverted index, etc)? How will you keep it memory-efficient?
3. How do you handle large-scale writes (e.g., new searches per day)? Do you update the Trie/index in real time or in batches?

Resources:
- Good overview — https://medium.com/double-pointer/system-design-interview-autocomplete-type-ahead-system-for-a-search-box-1ac968f9f121 — article
- 3 Approaches — https://systemdesignschool.io/problems/typeahead/solution — article
- Great explanation — https://www.youtube.com/watch?v=MCKX3n4-UR4 — video

Changes: missions/rules unchanged. Narrative: trie with top-k cached at each node (memory
trade-off), sampling + periodic batch rebuild vs streaming updates, prefix → top-k cache.

Reference: client → load-balancer → web-server ×2; each web-server → search-index, cache,
message-queue; message-queue → stream-processor → search-index; stream-processor →
nosql-database; web-server → monitoring.

### level-11 · Web Crawler — Q14
sourceUrl: https://systemdesign.io/question/design-web-crawler

Tips:
1. Should it be real-time or periodic?
2. How do you handle URL deduplication?
3. What system do you use to track visited vs unvisited URLs?
4. How to implement delay between requests to the same domain?
5. How to prioritize pages (e.g. news sites vs low-priority content)?
6. Should you support re-crawling? How do you schedule that?

Resources:
- Good solution — https://www.hellointerview.com/learn/system-design/problem-breakdowns/web-crawler — article

Changes: keep existing missions/rules; add required missions `connect worker → cache`
(per-domain politeness timestamps + robots.txt cache), `connect web-server → task-scheduler`,
`connect task-scheduler → message-queue` (periodic re-crawl feeds the frontier). Add bonus
`connect worker → dns` (DNS resolution cache). Narrative: priority frontier (front queues by
priority, back queues per host), URL normalization + content hashing for dedup.

Reference: client → web-server → message-queue; web-server → task-scheduler → message-queue;
message-queue → worker ×2; each worker → bloom-filter, blob-storage, search-index,
message-queue, cache, dns; web-server → monitoring.

### level-12 · Video Streaming Platform — Q7
sourceUrl: https://systemdesign.io/question/design-youtube-or-netflix

Tips:
1. How would you design the video upload pipeline - how is the video received, stored, and encoded into multiple resolutions?
2. How do you store videos? Object store like S3 or HDFS?
3. How do you ensure low-latency, high-availability playback across the globe? Would you use a CDN or edge caching?
4. What analytics do you track (watch time, engagement, abandonment)? How is it processed?

Resources:
- High Level Overview — https://bytebytego.com/courses/system-design-interview/design-youtube — course
- Good solution — https://www.hellointerview.com/learn/system-design/problem-breakdowns/youtube — article

Changes: keep existing missions/rules; add required missions
`connect load-balancer → api-gateway`, `connect client → cdn`, `connect cdn → blob-storage`,
`connect worker → blob-storage` (transcoded renditions written back). Add bonus
`connect message-queue → stream-processor` (watch-time analytics). Narrative: chunked /
resumable upload (presigned URLs), transcode into an HLS/DASH bitrate ladder, adaptive
bitrate playback.

Reference: client → load-balancer → api-gateway → web-server ×2; each web-server → cache,
sql-database, blob-storage, message-queue; message-queue → worker ×2 → blob-storage;
client → cdn → blob-storage; message-queue → stream-processor; web-server → monitoring.

---

## Act 3 (unit C2)

### level-14 · Instagram — Q3 · easy
sourceUrl: https://systemdesign.io/question/design-instagram

Tips:
1. How do you store billions of photos and videos reliably?
2. How do you ensure efficient retrieval when scrolling through a feed?
3. How do you optimize the UI to load the image fast?
4. How do you cache popular posts and feeds?
5. How do you handle fan-out to millions of followers for a celebrity post?

Resources:
- Good overview — https://www.designgurus.io/course-play/grokking-the-system-design-interview/doc/designing-instagram — course
- Interesting discussion — https://www.reddit.com/r/leetcode/comments/1dva2ng/rate_my_system_design_for_instagram/ — discussion
- Good summary at the very end — https://www.linkedin.com/pulse/instagram-system-design-blueprint-crack-faang-rocky-bhatia-w4jtc/ — article
- Great video on social network design — https://www.youtube.com/watch?v=S2y9_XYOZsg — video

Problem: upload photos/videos, follow users, scroll a home feed of followed users' posts.
Numbers: ~500 M DAU, ~100 M uploads/day, avg photo ~2 MB → ~200 TB/day of originals;
heavily read-dominant; feed load < 200 ms. Fast images: serve resized variants
(thumbnail / feed / full) from a CDN; cursor-paginated feed.

Missions (required): connect client → cdn; cdn → blob-storage; client → load-balancer;
load-balancer → web-server; web-server → blob-storage (store original);
web-server → nosql-database (post metadata); web-server → cache (read feed);
web-server → message-queue (new-post event); message-queue → worker;
worker → blob-storage (resized variants); worker → cache (fan-out into followers' feeds).
Bonus: connect worker → graph-database (follower lookup); add monitoring.
Topology: forbidden client → blob-storage ("images reach users through the CDN");
forbidden client → web-server; required-between via web-server, client → nosql-database.
Resilience: no-spof web-server; no-spof worker; requires-companion blob-storage ↔ cdn.
Hints: celebrity posts are not fanned out — merged at read time from the post store.

Reference: client → cdn → blob-storage; client → load-balancer → web-server ×2; each
web-server → blob-storage, nosql-database, cache, message-queue, monitoring;
message-queue → worker ×2; each worker → blob-storage, cache, graph-database.

### level-15 · Twitter — Q6 · easy
sourceUrl: https://systemdesign.io/question/design-twitter-for-millions-of-users

Tips:
1. This question is similar to designing and scaling a social network. Similar concepts apply.
2. What data will you store for each tweet? (tweet ID, user ID, timestamp, text, media link, etc.)
3. [r] How will you design for billions of tweets, millions of users, and high fan-out (e.g., accounts with millions of followers)?
4. How will you index tweets and store user timelines? (e.g., in separate timeline storage or as pointers to tweet objects?)
5. What will you cache (timelines? tweet metadata?) and where (e.g., Redis)?

Resources:
- Good overview — https://hayksimonyan.substack.com/p/system-design-interview-design-twitter — article
- Great video on social network design — https://www.youtube.com/watch?v=S2y9_XYOZsg — video
- High level solution — https://dev.to/zeeshanali0704/designing-twitter-a-system-design-interview-question-221e — article

Problem: post tweets (280 chars + media), follow, home timeline, search tweets.
Numbers: ~200 M DAU, ~500 M tweets/day (~6 K writes/s), timeline reads ~100× writes.
Key idea (differs from level-9): timelines are lists of tweet IDs in Redis pointing at
tweet objects in the tweet store; a search index is fed asynchronously.

Missions (required): connect client → load-balancer; load-balancer → web-server;
web-server → nosql-database (tweet store); web-server → cache (timeline of tweet IDs);
web-server → message-queue; message-queue → worker; worker → graph-database (followers);
worker → cache (push tweet ID into timelines); worker → search-index (index tweets).
Bonus: connect client → cdn; connect cdn → blob-storage (media).
Topology: forbidden client → web-server; forbidden client → nosql-database;
required-between via web-server, client → nosql-database.
Resilience: no-spof web-server; no-spof cache; requires-companion worker ↔ message-queue.

Reference: client → load-balancer → web-server ×2; each web-server → nosql-database,
cache ×2 (both), message-queue; message-queue → worker; worker → graph-database,
cache ×2, search-index; client → cdn → blob-storage.

### level-16 · Dropbox / Google Drive — Q4 · medium
sourceUrl: https://systemdesign.io/question/design-dropbox-or-google-drive

Tips:
1. How to partition data and scale it?
2. How to structure data as folders and files?
3. How to do writes and reads with partitions and replication.
4. How do you replicate data globally across data centers?
5. When an update happens, how does it propagate across replicas? What do other readers see?

Resources:
- Paper: Google File System — https://static.googleusercontent.com/media/research.google.com/en//archive/gfs-sosp2003.pdf — paper
- Solution from ex-Meta Engineer — https://www.youtube.com/watch?v=_UZ1ngy-kOI — video
- Dropbox problem breakdown — https://www.hellointerview.com/learn/system-design/problem-breakdowns/dropbox — article
- Mock Interview — https://www.tryexponent.com/courses/system-design-interviews/design-dropbox — course

Problem: upload/download files up to 50 GB, folders, sharing, sync across devices.
Files split into ~4 MB chunks addressed by content hash (dedup, resumable uploads,
delta sync). Metadata (folder tree via parent_id, file → ordered chunk list, versions) in a
strongly consistent relational store sharded by user/namespace; chunks in object storage,
replicated across regions. Uploads/downloads go through presigned URLs / CDN, not the app
servers. Change events notify the user's other devices over a persistent connection.
Do NOT forbid client → blob-storage (presigned direct upload is a correct design).

Missions (required): connect client → load-balancer; load-balancer → web-server;
web-server → sql-database (metadata); web-server → blob-storage (chunk upload URLs /
commit); client → cdn; cdn → blob-storage; web-server → pub-sub (file-changed events);
pub-sub → websocket-server; load-balancer → websocket-server (device sync channel).
Bonus: connect web-server → cache (metadata cache); add monitoring.
Topology: forbidden client → sql-database; required-between via web-server,
client → sql-database.
Resilience: no-spof web-server; no-spof sql-database (replicated metadata);
requires-companion blob-storage ↔ cdn.

Reference: client → load-balancer → web-server ×2 and → websocket-server; each web-server
→ sql-database ×2 (both), blob-storage, pub-sub, cache, monitoring; pub-sub →
websocket-server; client → cdn → blob-storage.

### level-17 · Google Calendar — Q18 · medium
sourceUrl: https://systemdesign.io/question/design-google-calendar

Tips:
1. Backend: How to structure the data? How to query free times in SQL? How would you store recurring events?
2. Frontend: How will you structure the Calendar UI? When you add a new event, how does the UI show the change?

Resources:
- Good High Level Solution — https://medium.com/%40astha2798/system-design-google-calendar-94894ddc9839 — article
- Solution from FAANG Engineer — https://www.youtube.com/watch?v=POfW0UULcyA — video
- Leetcode Discussion — https://leetcode.com/discuss/post/305654/system-design-google-calendar-by-kthtes-ttur/ — discussion
- Recurring Events — https://www.linkedin.com/pulse/tiny-system-design-google-calendar-like-app-recurring-rajesh-pillai/ — article

Problem: create/edit events, invite attendees, recurring events, free/busy lookup,
reminders, live updates. Data: events(id, owner, start, end, tz, rrule), attendees,
exceptions (overrides of single occurrences) — store the RRULE, expand occurrences at read
time for the requested window; free/busy = interval-overlap query
(`start < :windowEnd AND end > :windowStart`) on an index of (user, start). UI: optimistic
update, then reconcile with the server push.

Missions (required): connect client → load-balancer; load-balancer → web-server;
web-server → sql-database; web-server → cache (expanded views / free-busy);
web-server → task-scheduler (register reminders); task-scheduler → message-queue;
message-queue → worker; worker → notification-service (invites + reminders).
Bonus: connect web-server → pub-sub; connect pub-sub → websocket-server (live updates).
Topology: forbidden client → sql-database; required-between via web-server,
client → sql-database; forbidden web-server → notification-service ("reminders go through
the scheduler and queue, not the request path").
Resilience: no-spof web-server; requires-companion sql-database ↔ cache;
requires-companion message-queue ↔ dead-letter-queue.

Reference: client → load-balancer → web-server ×2; each web-server → sql-database, cache,
task-scheduler, pub-sub; cache → sql-database; task-scheduler → message-queue → worker →
notification-service; message-queue → dead-letter-queue; pub-sub → websocket-server.

### level-18 · Yelp / Nearby Friends — Q16 · expert
sourceUrl: https://systemdesign.io/question/design-yelp-or-nearby-friends

Tips:
1. How will you store location data? Will you use latitude-longitude, geohashing, or a spatial index (e.g., R-Tree, QuadTree)?
2. [r] How do you handle different types of proximity services - static (e.g., restaurants) vs dynamic (e.g., friends or drivers that keep moving)?
3. What kind of caching would you implement for frequently accessed areas (e.g., popular cities)?
4. How will you rank and personalize results (e.g., by distance, rating, user preferences)?

Resources:
- Good overview (available for free after login) — https://systemdesignschool.io/problems/yelp/solution — article
- Good video — https://www.youtube.com/watch?v=yz1jtze4qr8 — video
- High level summary (location proximity service) — https://www.youtube.com/watch?v=M4lR_Va97cQ&t=884s — video
- To get a better intuition (location proximity service) — http://youtube.com/watch?v=LHuhvvlFxA0 — video

Problem: (a) search businesses near a point with filters and ranking (static, read-heavy:
~200 M businesses, ~100 K searches/s peak); (b) see friends nearby in real time (dynamic:
clients push location every ~30 s). Static data → quadtree/geohash index rebuilt
periodically; dynamic data → latest location in an in-memory store with TTL plus pub/sub
fan-out to friends over WebSockets.

Missions (required): connect client → load-balancer; load-balancer → web-server;
web-server → geo-index; web-server → sql-database (business details); web-server → cache
(hot areas); load-balancer → websocket-server; websocket-server → cache (latest location,
TTL); websocket-server → pub-sub; pub-sub → websocket-server.
Bonus: connect web-server → search-index (text + rating ranking); add monitoring.
Topology: forbidden client → geo-index; forbidden client → sql-database;
required-between via web-server, client → sql-database.
Resilience: no-spof web-server; no-spof websocket-server; requires-companion
geo-index ↔ cache; requires-companion websocket-server ↔ pub-sub.

Reference: client → load-balancer → web-server ×2 and → websocket-server ×2; each
web-server → geo-index, sql-database, cache, search-index, monitoring; geo-index → cache;
each websocket-server → cache, pub-sub; pub-sub → both websocket-servers.

---

## Act 4 (unit C3)

### level-19 · Distributed Message Queue — Q19 · hard
sourceUrl: https://systemdesign.io/question/design-a-distributed-queue-like-rabbitmq

Tips:
1. How do you deal with high throughput?
2. When would you use a queue vs a pub-sub system?
3. How do you partition and scale horizontally?
4. How do you deal with machine failures?

Resources:
- Leetcode Discussion — https://leetcode.com/discuss/interview-question/system-design/206134/Amazon-or-System-Design-or-Design-a-Distributed-Message-queue — discussion
- Good detailed explanation — https://docs.google.com/document/d/1pOarvQbjzLd9tz5ZuxktyrYsZ41mbWba5_LUeFj65lI/edit?tab=t.0#heading=h.iq7ofd902vlf — article
- Mock Interview — https://www.tryexponent.com/blog/distributed-message-queue-system-design-mock-interview — article
- Detailed explanation video — https://www.youtube.com/watch?v=iJLL-KPqBpM — video

Problem: SQS/RabbitMQ-like service — send, receive, ack/delete; at-least-once delivery
with visibility timeout; each message consumed by one consumer (competing consumers);
queues sharded across broker nodes, each queue replicated (quorum queues); failed
messages to a DLQ after N attempts. The Client is the producer service; Workers are the
consumers. Queue vs pub-sub: one consumer per message vs every subscriber gets a copy.

Missions (required): add client; connect client → load-balancer;
load-balancer → message-queue (broker nodes); message-queue → worker (consumers);
message-queue → dead-letter-queue; message-queue → zookeeper-etcd (membership, queue
leadership, metadata).
Bonus: connect load-balancer → pub-sub; connect pub-sub → message-queue (fan-out exchange);
add monitoring.
Topology: forbidden client → worker; required-between via message-queue, client → worker;
forbidden client → zookeeper-etcd.
Resilience: no-spof message-queue; no-spof worker; requires-companion
message-queue ↔ dead-letter-queue; requires-companion message-queue ↔ zookeeper-etcd.

Reference: client → load-balancer → message-queue ×2 and → pub-sub; pub-sub → both
message-queues; each message-queue → worker ×2 (both), dead-letter-queue,
zookeeper-etcd, monitoring.

### level-20 · Distributed Log (Kafka) — Q11 · expert
sourceUrl: https://systemdesign.io/question/design-a-stream-processing-system-like-kafka

Tips:
1. Go over how Kafka might be designed.
2. What is the difference between Kafka and RabbitMQ?
3. How does Kafka ensure fast writes to the stream? Why is it fast?
4. How to scale it so that it can handle Facebook-level stream of data?
5. How to do the following: Fault Tolerance, Partitioning, Balancing Workloads across Nodes

Resources:
- Original Kafka paper (no need to finish it) — https://notes.stephenholiday.com/Kafka.pdf — paper
- Great overview — https://medium.com/better-programming/system-design-series-apache-kafka-from-10-000-feet-9c95af56f18d — article
- Solution from Meta Engineer — https://www.youtube.com/watch?v=DU8o-OTeoCc — video
- Good visualization — https://www.youtube.com/watch?v=HZklgPkboro — video

Problem: topics split into partitions; each partition is an append-only, ordered log on a
broker, replicated (leader + followers, ISR, acks=all); consumers in a consumer group
split partitions and track offsets, so messages are retained and replayable (unlike a
queue that deletes on ack). Fast because of sequential disk appends, OS page cache,
zero-copy sendfile and batching/compression. Controller (ZooKeeper or KRaft) handles
partition leadership and rebalancing. Producers talk to partition leaders directly using
broker metadata — no load balancer. The Client is the producer.

Missions (required): add client; connect client → message-queue (brokers);
message-queue → zookeeper-etcd (controller / metadata); message-queue → stream-processor
(consumer group); stream-processor → nosql-database (sink).
Bonus: connect message-queue → blob-storage (tiered storage of old segments); add monitoring.
Topology: forbidden client → stream-processor; required-between via message-queue,
client → stream-processor; forbidden client → zookeeper-etcd ("clients get metadata from
brokers, not the coordinator").
Resilience: no-spof message-queue (replicated partitions); no-spof stream-processor
(consumer group); requires-companion message-queue ↔ zookeeper-etcd.

Reference: client → message-queue ×2 (both); each message-queue → zookeeper-etcd,
stream-processor ×2 (both), blob-storage, monitoring; each stream-processor →
nosql-database.

### level-21 · Metrics Collection at Scale — Q17 · hard
sourceUrl: https://systemdesign.io/question/system-to-collect-metrics-from-thousands-of-servers

Tips:
1. What kind of metrics will you pull from the servers?
2. How do you fetch metrics? Do you use push or pull?
3. How often do you collect metrics?
4. Where do you store metrics and query them?
5. How do you display the metrics?
6. How do you send alerts? When will you send them?

Resources:
- Good solution — https://systemdesignschool.io/problems/realtime-monitoring-system/solution — article
- Nice article with overview — https://archive.is/Eezec — article

Problem: collect CPU / memory / disk / network / request-rate / error metrics from 10 K
servers every 10 s (~100 metrics each → ~100 K points/s), dashboards with 1-hour-to-30-day
ranges, alert within a minute of a threshold breach. This level models push: the Client is
the metrics agent on each server; the narrative must explain pull (Prometheus-style
scraping with service discovery) as the alternative and its trade-offs. Rollups
(1 s → 1 min → 1 h) keep long ranges cheap. Do not use the Monitoring component — this
level *is* the monitoring system.

Missions (required): add client; connect client → load-balancer; load-balancer → web-server
(ingestion + query API); web-server → message-queue; message-queue → stream-processor
(aggregate, downsample, evaluate alert rules); stream-processor → timeseries-db;
stream-processor → notification-service (alerts); web-server → timeseries-db (dashboard
queries).
Bonus: connect web-server → cache (dashboard query cache); connect timeseries-db →
blob-storage (archive rolled-up data).
Topology: forbidden client → timeseries-db; required-between via message-queue,
web-server → stream-processor.
Resilience: no-spof web-server; no-spof stream-processor; no-spof timeseries-db.

Reference: client → load-balancer → web-server ×2; each web-server → message-queue,
timeseries-db ×2 (both), cache; message-queue → stream-processor ×2; each
stream-processor → timeseries-db ×2 (both), notification-service; each timeseries-db →
blob-storage.

### level-22 · Distributed Logging & Search — Q10 · expert
sourceUrl: https://systemdesign.io/question/design-a-metrics-logging-and-aggregation-system

Tips:
1. Let's assume the logs are generated from a distributed system, e.g, an EC2 compute cluster.
2. How to collect logs efficiently from distributed systems?
3. How to store and index logs for fast retrieval?
4. When you search for logs, what happens?
5. How about live streaming logs? How would that work?

Resources:
- Detailed Solution from Google Engineer — https://www.youtube.com/watch?v=p_q-n09B8KA — video
- Good overview from Google Engineer — https://www.youtube.com/watch?v=_KoiMoZZ3C8 — video
- Related - Ad Click Aggregation — https://www.hellointerview.com/learn/system-design/problem-breakdowns/ad-click-aggregator — article
- Leetcode Discussion — https://leetcode.com/discuss/interview-question/system-design/622704/Design-a-system-to-store-and-retrieve-logs-for-all-of-eBay — discussion

Problem: agents on every EC2 host tail and batch log lines (the Client is the host agent —
and also the engineer's browser); ~1 M lines/s (~120 B/line → ~10 TB/day raw, ~1 TB/day compressed); full-text search over the last
7 days in seconds (hot tier, time-partitioned indices), 1 year archived in object storage
(cold tier); live tail streams new matching lines to the browser. Do not use the
Log Aggregator component — this level *is* the log aggregator.

Missions (required): connect client → load-balancer; load-balancer → web-server
(ingestion + query API); web-server → message-queue; message-queue → stream-processor
(parse, enrich, index); stream-processor → search-index (hot); stream-processor →
blob-storage (cold archive); web-server → search-index (search queries);
stream-processor → pub-sub; pub-sub → websocket-server; load-balancer → websocket-server
(live tail).
Bonus: connect web-server → cache (recent query results); add monitoring.
Topology: forbidden client → search-index; required-between via message-queue,
web-server → stream-processor.
Resilience: no-spof web-server; no-spof message-queue; no-spof search-index.

Reference: client → load-balancer → web-server ×2 and → websocket-server; each
web-server → message-queue ×2 (both), search-index ×2 (both), cache, monitoring; each
message-queue → stream-processor; stream-processor → search-index ×2, blob-storage,
pub-sub; pub-sub → websocket-server.

### level-23 · Top-K Shared Articles — Q13 · hard
sourceUrl: https://systemdesign.io/question/identify-k-most-shared-articles-in-time-windows

Tips:
1. At its core - what algorithm would you use? Count Min Sketch? or some other?
2. How will you ensure that each new update (share) is fast?
3. How do you use caching to improve read performance?
4. How will you scale this as updates get very frequent?

Resources:
- Leetcode discussion — https://leetcode.com/discuss/interview-question/system-design/258398/design-top-shared-post-system-in-5mins1-hour1-day1-week — discussion
- Official Google Mock Interview — https://www.youtube.com/watch?v=S1DvEdR0iUo — video
- Great high level overview — https://mecha-mind.medium.com/system-design-top-k-trending-hashtags-4e12de5bb846 — article
- Solution from Meta Engineer — https://www.youtube.com/watch?v=1lfktgZ9Eeo — video
- Text solution — https://www.hellointerview.com/learn/system-design/problem-breakdowns/top-k — article

Problem: return the K (≤ 100) most-shared articles for the last 5 min, 1 h and 24 h.
~10 K shares/s average, ~100 K/s peak; reads served from precomputed lists in < 50 ms.
The share write path only appends an event (fast). Aggregators partitioned by article id
keep per-minute buckets (sliding windows = sum of buckets) and a min-heap of size K, or a
count-min sketch + heap for approximate counts at scale; partial top-Ks are merged and
written to the cache per window. Durable per-minute counts allow recovery and exact
recomputation.

Missions (required): connect client → load-balancer; load-balancer → web-server
(share + query API); web-server → message-queue (share events);
message-queue → stream-processor; stream-processor → cache (top-K per window);
web-server → cache (reads); stream-processor → nosql-database (per-minute counts).
Bonus: connect message-queue → blob-storage (raw events for batch recomputation);
add monitoring.
Topology: forbidden client → cache; required-between via message-queue,
web-server → stream-processor.
Resilience: no-spof web-server; no-spof stream-processor; requires-companion
stream-processor ↔ nosql-database.

Reference: client → load-balancer → web-server ×2; each web-server → message-queue,
cache, monitoring; message-queue → stream-processor ×2, blob-storage; each
stream-processor → cache, nosql-database.

### level-24 · Web Analytics Pipeline — Q20 · hard
sourceUrl: https://systemdesign.io/question/design-google-analytics-dashboard-and-pipeline

Tips:
1. How do you collect and present real time data?
2. How will you ensure that all user visits are being transmitted?
3. How do you store and structure the data?
4. How do you ensure high throughput of user events?

Resources:
- Leetcode — https://leetcode.com/discuss/interview-question/system-design/562404/system-designmicrosoft-real-time-analytics — discussion
- Facebook EM's Mock Interview — https://www.youtube.com/watch?v=kIcq1_pBQSY — video
- Designing a Dashboard with Data with FAANG Engineer — https://www.youtube.com/watch?v=8_5Gve7aNRk — video

Problem: a tracking script on customer sites sends page-view / event beacons (the Client
is the visitor's browser and also the site owner's dashboard). ~1 M events/s peak.
Real-time dashboard (active users, last 30 min) via streaming aggregation into a
time-series store; historical reports via raw events archived in object storage and
batch-loaded into a columnar warehouse. Delivery: client batching + retry with
`navigator.sendBeacon`, idempotent event ids → at-least-once with dedup; collector only
validates and appends to the queue; poison events go to a DLQ.

Missions (required): connect client → load-balancer; load-balancer → web-server
(collector + dashboard API); web-server → message-queue; message-queue → stream-processor;
stream-processor → timeseries-db (real-time aggregates); message-queue → worker
(batch loader); worker → blob-storage (raw archive); worker → data-warehouse;
web-server → cache (dashboard queries); message-queue → dead-letter-queue.
Bonus: connect web-server → timeseries-db; connect web-server → data-warehouse
(dashboard reads); add monitoring.
Topology: forbidden client → data-warehouse; forbidden client → timeseries-db;
required-between via message-queue, web-server → stream-processor.
Resilience: no-spof web-server; no-spof message-queue; requires-companion
message-queue ↔ dead-letter-queue.

Reference: client → load-balancer → web-server ×2; each web-server → message-queue ×2
(both), cache, timeseries-db, data-warehouse, monitoring; each message-queue →
stream-processor, worker, dead-letter-queue; stream-processor → timeseries-db;
worker → blob-storage, data-warehouse.
