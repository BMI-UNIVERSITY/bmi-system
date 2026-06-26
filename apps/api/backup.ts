export interface Env {
  DB: D1Database;
  BACKUP_BUCKET: R2Bucket;
  BACKUP_ENCRYPTION_KEY?: string;
}

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
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const encryptionKey = env.BACKUP_ENCRYPTION_KEY;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `d1-backups/bmi-portal-db-${timestamp}.sql`;

    const tables = [
      'users', 'applications', 'documents', 'recommendation_requests',
      'application_status_logs', 'password_reset_tokens', 'admin_audit_logs',
      'courses', 'enrollments', 'invoices'
    ];

    let backupSql = `-- BMI Portal D1 Backup - ${timestamp}\n\n`;

    for (const table of tables) {
      backupSql += `-- Table: ${table}\n`;
      const { results } = await env.DB.prepare(`SELECT * FROM ${table}`).all();
      if (results.length > 0) {
        backupSql += `INSERT INTO ${table} VALUES\n`;
        backupSql += results.map(row => {
          const values = Object.values(row).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            return String(val);
          }).join(', ');
          return `  (${values})`;
        }).join(',\n');
        backupSql += ';\n\n';
      }
    }

    let body: ArrayBuffer | string = backupSql;
    const metadata: Record<string, string> = {};

    if (encryptionKey) {
      body = await encryptBackup(backupSql, encryptionKey);
      metadata['encrypted'] = 'aes-256-gcm';
      console.log(`Backup encrypted with AES-256-GCM: ${backupKey}`);
    } else {
      console.warn(`WARNING: Backup stored unencrypted: ${backupKey}. Set BACKUP_ENCRYPTION_KEY (64 hex chars) as a Cloudflare secret.`);
    }

    await env.BACKUP_BUCKET.put(backupKey, body, {
      httpMetadata: {
        contentType: encryptionKey ? 'application/octet-stream' : 'text/plain',
      },
      customMetadata: metadata,
    });

    console.log(`Backup created: ${backupKey}`);
  },
};
