# BMI System Runbook & On-Call Guide

## 1. Sentry Alerting

Errors in production are captured by `@sentry/cloudflare` inside the worker boundary. 

### Setting Up Alerts (Manual Step via Sentry Dashboard)
Since Sentry alerts cannot be configured strictly via code in this stack, complete these steps in the Sentry UI:
1. Navigate to **Alerts -> Create Alert Rule**.
2. Select **Metric Alert**.
3. Condition: **Event type: Error**.
4. Threshold: **Count exceeds 10 in 5 minutes** (or >1% error rate).
5. Action: **Send Slack notification** to `#eng-alerts` and **Email** to `ops@hkmministries.org` (or configured `OPS_ALERT_EMAIL`).

## 2. Investigating Error Spikes

If an alert triggers, use Cloudflare's tailing tools to inspect production traffic live.

**For auth errors:**
```bash
npx wrangler tail bmi-auth --env production
```

**For UMS or Core errors:**
```bash
npx wrangler tail bmi-ums --env production
npx wrangler tail bmi-core --env production
```

## 3. Resolving `SQLITE_BUSY` Errors

If `SQLITE_BUSY` or `D1_ERROR` spikes appear in the logs:

1. **Verify WriteQueue Health**: 
   Ensure the WriteQueue Durable Object is not crashing.
   ```bash
   npx wrangler tail bmi-auth --env production | grep WriteQueue
   ```
2. **Verify Concurrency Limits**:
   Check `apps/api/wrangler.jsonc` or the worker's `wrangler.jsonc` to ensure `max_concurrent_requests` is strictly set to `2`.
3. **Verify Read Saturation (Caching)**:
   Ensure `caches.default` is actively caching high-volume `GET` endpoints (`/api/v1/students`, `/api/v1/courses`). Bypassed caches can overwhelm the 10-connection limit.

### Troubleshooting Cache Misses
If the UMS dashboard loads slowly: 
Check the Cache API hit rate via `wrangler tail bmi-ums | grep 'Cache:'`. 
If cache misses are high, verify `cache.md` is applied and the Worker has the `caches.default` binding. 
**Fallback**: Add `?nocache=1` query param to bypass the cache for troubleshooting.

## 4. Recovering from Dead Webhooks

Webhooks that exceed max retries are written to the `webhook_dead_letters` table.
To review and manually retry them:
```sql
SELECT id, event_log_id, payload, error_reason FROM webhook_dead_letters WHERE resolved_at IS NULL;
```
Once fixed downstream, update `resolved_at` via D1 or the admin portal.

---

## 5. Rate Limiter (RateLimiter DO) Failure Modes

The `RateLimiter` Durable Object tracks per-IP request counts in DO transactional storage.

### Symptom: All requests getting 429 (false positives)
1. Check if the DO alarm fired incorrectly and failed to clear storage.
2. Tail the `bmi-auth` worker for alarm errors:
   ```bash
   npx wrangler tail bmi-auth --env production | grep RateLimiter
   ```
3. **Emergency reset** (only if confirmed false positives):
   ```bash
   # Delete the specific DO instance by IP (replace <IP> with the affected IP)
   npx wrangler durable-objects delete --namespace RATE_LIMITER --id-from-name <IP>
   ```

### Symptom: Rate limiter not triggering (brute-force not blocked)
1. Verify the `RATE_LIMITER` DO binding is present in `wrangler.jsonc`.
2. Verify the `rateLimitMiddleware` is imported and called before routing.
3. Check Cloudflare's firewall logs to confirm CF-Connecting-IP is being forwarded.

---

## 6. WriteQueue Shard Management

The `WriteQueue` is sharded across **8 Durable Object instances** (shard-0 through shard-7).
Each entity (e.g., a `student_id`) is deterministically routed to a shard via djb2 hash.

### Symptom: High DO alarm lag (> 500ms)
This indicates a shard is overloaded. Options:
1. **Monitor**: Check per-shard DO execution time in Cloudflare dashboard.
2. **Scale**: Increase `WRITE_QUEUE_SHARDS` constant in `WriteQueue.ts` (e.g., from 8 to 16).
   > ⚠️ **Drain existing shards first!** Old shard-N instances must be empty before renaming.
3. **Drain procedure**:
   ```bash
   # Tail each shard for queue depth
   npx wrangler tail bmi-auth --env production | grep "pendingQueue"
   ```

### Symptom: D1 batch write failures on a specific shard
1. Identify which shard is failing from logs (`shard-N` in error message).
2. The DO will retry with exponential backoff (200ms → 400ms → 800ms).
3. If retries exhaust, the pending queue is persisted to DO storage.
4. The DO alarm will fire after 10 seconds to recover.
5. **Force alarm** (if DO appears stuck):
   ```bash
   # Not directly possible via CLI — redeploy the worker to reset the instance
   npx wrangler deploy --env production
   ```

---

## 7. D1 Database Recovery

### Symptom: D1 write quota exceeded
D1 has a per-day write row limit on the Workers Paid plan.
1. Check Cloudflare dashboard → Analytics → D1 for write count.
2. Identify the offending endpoint via Logpush (look for high `rows_written` in log meta).
3. **Immediate mitigation**: Temporarily disable the high-write endpoint via a feature flag in KV.

### Symptom: D1 corruption / accidental data deletion
1. Restore from the most recent backup in `bmi-portal-backups` R2 bucket.
2. List available backups:
   ```bash
   npx wrangler r2 object list bmi-portal-backups
   ```
3. Download and apply the backup:
   ```bash
   npx wrangler r2 object get bmi-portal-backups/backup-<date>.sql --file ./restore.sql
   npx wrangler d1 execute bmi-portal-db --file ./restore.sql --env production
   ```

### Symptom: Migration drift (schema out of sync)
```bash
cd apps/api
npm run verify-migrations  # Checks applied migrations vs pending ones
npm run db:migrate         # Applies pending migrations to production D1
```

---

## 8. JWT Key Rotation Issues

### Symptom: Users getting logged out unexpectedly after key rotation
The `previous` key should cover sessions signed in the last 2 days.
1. Verify the `previous` key is still in `AUTH_KEYS` KV:
   ```bash
   npx wrangler kv key get previous --namespace-id <AUTH_KEYS_NAMESPACE_ID>
   ```
2. If missing, the previous key was lost. Users must re-authenticate.
3. To prevent future loss: ensure the `rotate-keys.ts` cron saves `active` → `previous` before generating a new key.

### Symptom: Key rotation cron not triggering
1. Verify the cron expression in `wrangler.jsonc`: `"crons": ["0 0 1 * *"]`.
2. Check Cloudflare dashboard → Workers → bmi-auth → Triggers → Cron Triggers.
3. Manually trigger a rotation for testing:
   ```bash
   npx wrangler trigger schedule bmi-auth --env production
   ```

