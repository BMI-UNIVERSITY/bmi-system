/**
 * JWT Key Rotation Script — Cloudflare Cron Trigger
 *
 * Rotates the active HMAC-SHA256 JWT signing key stored in Cloudflare KV
 * with a 30-day rotation window and a 2-day grace period.
 *
 * Key Schema in AUTH_KEYS KV:
 *   "active"   → { keyId: string; key: string; createdAt: string }
 *   "previous" → { keyId: string; key: string; createdAt: string }
 *
 * Deployment: scheduled as a Cron Trigger in wrangler.jsonc of the auth worker.
 *   "triggers": { "crons": ["0 0 1 * *"] }  (runs midnight on the 1st of each month)
 *
 * Verification logic (in jwt.ts / auth.ts) must:
 *   1. Try verifying with the "active" key.
 *   2. If that fails, try the "previous" key (to cover tokens signed before rotation).
 *   3. Reject if both fail.
 */

interface KeyRecord {
  keyId: string;
  key: string; // base64-encoded 32-byte secret
  createdAt: string;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface Env {
  AUTH_KEYS: KVNamespace;
}

/**
 * Generates a cryptographically secure 32-byte key encoded as base64.
 */
function generateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export default {
  /**
   * Called by the Cloudflare runtime on each cron tick.
   * Can also be triggered manually by `wrangler trigger schedule`.
   */
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const now = new Date().toISOString();

    // 1. Fetch the current active key
    const activeRaw = await env.AUTH_KEYS.get('active');
    const activeKey: KeyRecord | null = activeRaw ? JSON.parse(activeRaw) : null;

    // 2. Check if rotation is actually needed (30-day window)
    if (activeKey) {
      const created = new Date(activeKey.createdAt).getTime();
      const ageDays = (Date.now() - created) / (1000 * 60 * 60 * 24);
      if (ageDays < 30) {
        console.log(`[key-rotation] Active key (${activeKey.keyId}) is only ${ageDays.toFixed(1)} days old — skipping rotation.`);
        return;
      }
    }

    // 3. Promote active → previous (for the 2-day grace period)
    if (activeKey) {
      await env.AUTH_KEYS.put('previous', JSON.stringify(activeKey));
    }

    // 4. Generate and store the new active key
    const newKey: KeyRecord = {
      keyId: crypto.randomUUID(),
      key: generateKey(),
      createdAt: now,
    };
    await env.AUTH_KEYS.put('active', JSON.stringify(newKey));

    console.log(`[key-rotation] ✅ JWT key rotated. New active keyId: ${newKey.keyId}. Previous keyId: ${activeKey?.keyId ?? 'none'}`);
  },
};
