import type { Env } from './lib/types';

async function encryptBackup(plaintext: string, keyHex: string): Promise<ArrayBuffer> {
  const keyBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return combined.buffer;
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const encryptionKey = env.BACKUP_ENCRYPTION_KEY;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `d1-backups/bmi-portal-db-${timestamp}`;

    const tables = [
      'users', 'applications', 'documents', 'recommendation_requests',
      'application_status_logs', 'password_reset_tokens', 'admin_audit_logs',
      'sessions', 'rate_limits', 'email_verifications', 'oauth_accounts',
      'app_config', 'courses', 'enrollments', 'invoices', 'cms_pages',
      'cms_posts', 'cms_media', 'student_settings', 'support_tickets',
      'sync_event_log', 'webhook_dead_letters', 'students', 'staff',
      'faculties', 'departments', 'programs', 'academic_terms',
      '_migrations', 'grades', 'certificates'
    ];

    // Housekeeping: delete expired sessions and rate limits
    ctx.waitUntil((async () => {
      try {
        await env.PLATFORM_CONTEXT!.db.prepare('DELETE FROM sessions WHERE expires_at < datetime("now")').run();
        const oldWindow = (Math.floor(Date.now() / 60000) - 2).toString();
        await env.PLATFORM_CONTEXT!.db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(oldWindow).run();
      } catch (e) {
        console.error('Housekeeping error:', e);
      }
    })());

    const BACKUP_CHUNK_SIZE = 1000;

    for (const table of tables) {
      try {
        let allResults: Record<string, unknown>[] = [];
        let offset = 0;

        while (true) {
          const { results } = await env.PLATFORM_CONTEXT!.db.prepare(
            `SELECT * FROM ${table} ORDER BY rowid LIMIT ? OFFSET ?`
          ).bind(BACKUP_CHUNK_SIZE, offset).all<Record<string, unknown>>();
          if (results.length === 0) break;
          allResults = allResults.concat(results);
          offset += results.length;
          if (results.length < BACKUP_CHUNK_SIZE) break;
        }

        if (allResults.length === 0) continue;

        let body: ArrayBuffer | string = JSON.stringify(allResults);
        const metadata: Record<string, string> = { table, rowCount: String(allResults.length) };

        if (encryptionKey) {
          body = await encryptBackup(body, encryptionKey);
          metadata['encrypted'] = 'aes-256-gcm';
        }

        const backupKey = `${backupDir}/${table}.json`;
        await env.BACKUP_BUCKET.put(backupKey, body, {
          httpMetadata: {
            contentType: encryptionKey ? 'application/octet-stream' : 'application/json',
          },
          customMetadata: metadata,
        });
      } catch (e) {
        console.error(`Error backing up table ${table}:`, e);
      }
    }

    if (!encryptionKey) {
      console.warn(`WARNING: Backup stored unencrypted: ${backupDir}. Set BACKUP_ENCRYPTION_KEY (64 hex chars) as a Cloudflare secret.`);
    }

    console.log(`Backup completed: ${backupDir}`);
  },
};
