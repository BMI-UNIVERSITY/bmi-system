# Caching Design — BMI Multi-Worker Architecture

> **Status**: Required pre-merge gate for Phase 2 Worker Domain Decomposition Epic  
> **Author**: Engineering  
> **Applies to**: `bmi-public`, `bmi-ums`, `bmi-core` Workers

---

## 1. Why Caching Is Non-Negotiable

Cloudflare D1 enforces a **hard limit of 10 concurrent connections globally** per database.  
After the Worker split, 6 Workers can each open parallel connections. Without a caching layer:

- 6 Workers × 2 concurrent reads each = **12 connections** during mild load
- Under registration spikes: easily **30–50 simultaneous connections**
- Result: `SQLITE_BUSY` errors on **read-only endpoints** — the most user-visible failure mode

The caching layer must be implemented **before any Worker is deployed to production**.

---

## 2. Caching Strategy by Worker

### 2a. `bmi-public` Worker — KV Snapshot Cache (No Per-Request D1)

**Scope**: All endpoints under `/api/public/*`
- `/api/public/programs`
- `/api/public/stats`
- `/api/public/cms/posts`
- `/api/public/cms/posts/:slug`
- `/api/public/cms/pages/:slug`

**Strategy**: **KV Snapshot + Cloudflare Cache API**

```
┌─────────────┐      Cache HIT      ┌──────────────────────────────┐
│   Request   │ ──────────────────► │  Cloudflare Cache API (Edge) │
│  (browser)  │                     └──────────────────────────────┘
└─────────────┘      Cache MISS
        │        ──────────────────► ┌────────────┐    ┌─────────────────┐
        │                            │ bmi-public │───►│  KV: cf_cache   │
        │                            │   Worker   │    └─────────────────┘
        │                            └────────────┘           │ miss
        │                                                      ▼
        │                                              ┌──────────────┐
        │                                              │   D1 Query   │
        │                                              └──────────────┘
        └──────────────────────────────────────────────────────────────
```

**TTL Values**:

| Endpoint | Cache-Control | Rationale |
|----------|--------------|-----------|
| `/api/public/programs` | `public, max-age=300, s-maxage=300` | Programs change rarely (≤weekly) |
| `/api/public/stats` | `public, max-age=300, s-maxage=300` | Stats are lagging indicators |
| `/api/public/cms/posts` | `public, max-age=120, s-maxage=120` | Posts may be updated more often |
| `/api/public/cms/posts/:slug` | `public, max-age=300, s-maxage=300` | Individual posts are stable |
| `/api/public/cms/pages/:slug` | `public, max-age=600, s-maxage=600` | Pages are near-static |

**D1 Access Pattern**:
- D1 is **never queried per-request** in `bmi-public`.
- A **scheduled cron** (every 5 minutes) queries D1, serialises results to KV, and also populates the Cache API with the correct `Cache-Control` headers.
- On a cache miss (first request after deployment), the Worker queries D1 once, stores the result in KV and Cache, then returns it. Subsequent requests never reach D1.

**Implementation**:
```typescript
// public-worker/lib/cache.ts
export async function cachedFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  env: Env,
  request: Request
): Promise<Response> {
  const cache = caches.default;
  const cacheUrl = new URL(`https://cache.bmi-internal/${key}`);
  const cacheKey = new Request(cacheUrl.toString());

  // 1. Try Cloudflare Cache API (edge-level, zero-cost)
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // 2. Try KV (regional, sub-ms)
  const kvData = await env.CF_CACHE.get(key, 'json');
  if (kvData) {
    const res = new Response(JSON.stringify({ success: true, data: kvData }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`,
        'X-Cache': 'HIT-KV',
      },
    });
    // Backfill Cache API from KV
    await cache.put(cacheKey, res.clone());
    return res;
  }

  // 3. Fallback: query D1, store in both KV and Cache API
  const data = await fetcher();
  await env.CF_CACHE.put(key, JSON.stringify(data), { expirationTtl: ttlSeconds });
  const res = new Response(JSON.stringify({ success: true, data }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`,
      'X-Cache': 'MISS',
    },
  });
  await cache.put(cacheKey, res.clone());
  return res;
}
```

**Cache Invalidation**:
- Triggered by the CMS write Workers (`bmi-admin` or `bmi-core`) calling `env.CF_CACHE.delete(key)` on the relevant KV key after a successful write.
- Cache API invalidation is handled automatically on TTL expiry (no manual purge needed for edge cache).

---

### 2b. `bmi-ums` and `bmi-core` Workers — Read-Through Cache (Cache API)

**Scope**: All `handleList*` and `handleGet*` (by ID) endpoints  
**Examples**: `GET /api/v1/students`, `GET /api/v1/grades`, `GET /api/v1/courses`

**Strategy**: **Cloudflare Cache API, per-request keyed by URL + query string**

```typescript
// shared/lib/read-through-cache.ts
export async function readThrough(
  request: Request,
  ttlSeconds: number,
  handler: () => Promise<Response>
): Promise<Response> {
  // Only cache GET requests — never cache POST/PUT/DELETE
  if (request.method !== 'GET') return handler();

  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) {
    // Clone and add HIT header for observability
    const headers = new Headers(cached.headers);
    headers.set('X-Cache', 'HIT');
    return new Response(cached.body, { status: cached.status, headers });
  }

  const response = await handler();

  // Only cache 200 responses — never cache errors
  if (response.status === 200) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', `private, max-age=${ttlSeconds}`);
    // 'private' — cached per-user at the Worker level, not at CDN edge
    headers.set('X-Cache', 'MISS');
    const cacheable = new Response(response.clone().body, { status: 200, headers });
    await cache.put(request, cacheable);
  }

  return response;
}
```

**TTL Values**:

| Endpoint Group | TTL | Rationale |
|----------------|-----|-----------|
| `GET /api/v1/students*` | 60s | Student records change on staff writes only |
| `GET /api/v1/grades*` | 30s | Grade updates are more frequent |
| `GET /api/v1/courses*` | 300s | Course catalogue is near-static |
| `GET /api/v1/timetabling*` | 120s | Updated weekly |
| `GET /api/applications*` | 30s | Application status changes frequently |

**Cache Invalidation**:
- Any `POST`, `PUT`, `PATCH`, or `DELETE` handler that mutates a list must call:
  ```typescript
  await caches.default.delete(`https://cache.bmi-internal/students`);
  ```
- Implemented via an `invalidateCache(pattern: string)` utility in `@bmi/api-middleware`.

---

## 3. `wrangler.jsonc` Snippets

### `bmi-public` Worker (`apps/workers/public/wrangler.jsonc`)
```jsonc
{
  "name": "bmi-public",
  "main": "index.ts",
  "compatibility_date": "2025-01-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "bmi-portal-db",
      "database_id": "a5e26ad9-5d8e-4afa-9ad9-8cd55c1cbf1a",
      // Enforce max 2 concurrent D1 connections from this Worker instance
      // 6 Workers × 2 = 12 potential concurrent connections; stays near D1's 10-limit
      "max_concurrent_requests": 2
    }
  ],
  "kv_namespaces": [
    {
      "binding": "CF_CACHE",
      "id": "<KV_NAMESPACE_ID_FOR_PUBLIC_CACHE>"
    }
  ],
  "triggers": {
    // Cron refreshes KV snapshot every 5 minutes
    "crons": ["*/5 * * * *"]
  },
  "routes": [
    { "pattern": "bmi-api.hkmministries.org/api/public/*", "zone_name": "hkmministries.org" }
  ]
}
```

### `bmi-auth` Worker (`apps/workers/auth/wrangler.jsonc`)
```jsonc
{
  "name": "bmi-auth",
  "main": "index.ts",
  "compatibility_date": "2025-01-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "bmi-portal-db",
      "database_id": "a5e26ad9-5d8e-4afa-9ad9-8cd55c1cbf1a",
      "max_concurrent_requests": 2
    }
  ],
  "durable_objects": {
    "bindings": [
      { "name": "WRITE_QUEUE", "class_name": "WriteQueue" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_classes": ["WriteQueue"] }
  ],
  "routes": [
    { "pattern": "bmi-api.hkmministries.org/api/auth/*", "zone_name": "hkmministries.org" }
  ]
}
```

### `bmi-ums` Worker (`apps/workers/ums/wrangler.jsonc`)
```jsonc
{
  "name": "bmi-ums",
  "main": "index.ts",
  "compatibility_date": "2025-01-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "bmi-portal-db",
      "database_id": "a5e26ad9-5d8e-4afa-9ad9-8cd55c1cbf1a",
      "max_concurrent_requests": 2
    }
  ],
  // Service Binding to auth for token verification
  "services": [
    { "binding": "AUTH_SERVICE", "service": "bmi-auth" }
  ],
  "routes": [
    { "pattern": "bmi-api.hkmministries.org/api/v1/*", "zone_name": "hkmministries.org" }
  ]
}
```

### Monolith Proxy (During Migration)
```jsonc
// Existing apps/api/wrangler.jsonc — add service bindings as each domain migrates
"services": [
  { "binding": "PUBLIC_WORKER",   "service": "bmi-public"   },
  { "binding": "AUTH_WORKER",     "service": "bmi-auth"     },
  { "binding": "UMS_WORKER",      "service": "bmi-ums"      },
  { "binding": "CORE_WORKER",     "service": "bmi-core"     },
  { "binding": "ADMIN_WORKER",    "service": "bmi-admin"    },
  { "binding": "WEBHOOK_WORKER",  "service": "bmi-webhooks" }
]
```

And in `apps/api/index.ts` (migration router):
```typescript
// During migration: forward to new Workers once they are live
if (path.startsWith('/api/public/')) {
  return env.PUBLIC_WORKER.fetch(request);
}
if (path.startsWith('/api/auth/')) {
  return env.AUTH_WORKER.fetch(request);
}
// ... existing handlers for not-yet-migrated domains
```

---

## 4. D1 Views Migration (`0009_add_cross_domain_views.sql`)

```sql
-- Eliminates cross-Worker JOINs by pre-computing common aggregations in D1.
-- Workers query the view directly; no inter-service HTTP calls required.

CREATE VIEW IF NOT EXISTS v_student_with_application AS
SELECT
  s.id              AS student_id,
  s.reg_no,
  s.programme,
  s.status          AS student_status,
  u.first_name,
  u.last_name,
  u.email,
  a.id              AS application_id,
  a.status          AS application_status,
  a.submitted_at
FROM students s
INNER JOIN users u ON s.user_id = u.id
LEFT JOIN applications a ON a.user_id = u.id
  AND a.id = (
    SELECT id FROM applications
    WHERE user_id = u.id
    ORDER BY submitted_at DESC LIMIT 1
  );

CREATE VIEW IF NOT EXISTS v_student_dashboard AS
SELECT
  s.user_id,
  s.reg_no,
  s.programme,
  COUNT(DISTINCT e.id)  AS enrolled_courses,
  COUNT(DISTINCT g.id)  AS graded_courses,
  ROUND(AVG(g.score), 2) AS gpa,
  SUM(CASE WHEN inv.status = 'unpaid' THEN inv.amount ELSE 0 END) AS outstanding_balance
FROM students s
LEFT JOIN enrollments e  ON e.student_id = s.id
LEFT JOIN grades g       ON g.student_id = s.id
LEFT JOIN invoices inv   ON inv.student_id = s.id
GROUP BY s.user_id, s.reg_no, s.programme;

CREATE VIEW IF NOT EXISTS v_admin_user_overview AS
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  u.is_verified,
  u.created_at,
  s.reg_no,
  s.programme,
  sess.expires_at AS session_expires_at
FROM users u
LEFT JOIN students s    ON s.user_id = u.id
LEFT JOIN sessions sess ON sess.user_id = u.id;
```

---

## 5. Fallback Behaviour on Cache Miss / KV Unavailability

| Scenario | Behaviour |
|----------|-----------|
| Cache API miss (first request) | Queries D1 once, populates cache, returns response |
| KV namespace unreachable | Falls through to D1 with warning log; no 5xx |
| D1 SQLITE_BUSY on cache miss | Returns `503` with `Retry-After: 2` header |
| D1 SQLITE_BUSY on public cron | Cron retries after 30s; stale KV data remains valid |
| Cache API eviction | Next request repopulates from KV or D1 |

---

## 6. Observability

All cached responses include:
- `X-Cache: HIT | MISS | HIT-KV` — visible in browser DevTools and Cloudflare logs
- `Age: <seconds>` — how long the cached response has been in cache
- `CF-Cache-Status` — set automatically by Cloudflare's edge for CDN-cached responses

This allows the SRE team to monitor cache effectiveness in Cloudflare Analytics without any additional tooling.
