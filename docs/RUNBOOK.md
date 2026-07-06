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
