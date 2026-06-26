#!/usr/bin/env tsx
/**
 * BMI UMS — Fast Wipe
 * Deletes all records from academic_records, students, courses, modules, campuses
 * using parallel batch deletes. Much faster than sequential per-record deletes.
 *
 * Run: npx tsx backend/scripts/fast-wipe.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

const PB_URL   = process.env.POCKETBASE_URL            ?? 'http://127.0.0.1:8090';
const PB_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL    ?? 'admin@bmi.edu';
const PB_PASS  = process.env.POCKETBASE_ADMIN_PASSWORD ?? (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

async function wipeFast(token: string, collection: string) {
  process.stdout.write(`   Wiping ${collection.padEnd(20)}... `);
  let total = 0;
  while (true) {
    const r = await fetch(
      `${PB_URL}/api/collections/${collection}/records?perPage=200&skipTotal=1`,
      { headers: { Authorization: token } }
    );
    const d: any = await r.json();
    if (!d.items || d.items.length === 0) break;

    // Delete in parallel chunks of 20
    const chunks: any[][] = [];
    for (let i = 0; i < d.items.length; i += 20) chunks.push(d.items.slice(i, i + 20));
    for (const chunk of chunks) {
      await Promise.all(chunk.map((item: any) =>
        fetch(`${PB_URL}/api/collections/${collection}/records/${item.id}`, {
          method: 'DELETE', headers: { Authorization: token }
        })
      ));
      total += chunk.length;
    }
    if (d.items.length < 200) break;
  }
  console.log(`${total} deleted`);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  BMI UMS — Fast Collection Wipe          ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const resp = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASS })
  });
  if (!resp.ok) { console.error('Auth failed:', await resp.text()); process.exit(1); }
  const auth: any = await resp.json();
  const token = auth.token;
  console.log('✅  Authenticated\n');

  // Wipe in dependency order (children before parents)
  await wipeFast(token, 'academic_records');
  await wipeFast(token, 'students');
  await wipeFast(token, 'courses');
  await wipeFast(token, 'modules');
  await wipeFast(token, 'campuses');

  console.log('\n✅  All collections wiped clean.\n');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
