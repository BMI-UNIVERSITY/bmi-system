/**
 * One-time cleanup script: Deletes ALL records from academic reference collections
 * so the seed can re-run cleanly on next backend start.
 *
 * Usage: npx tsx backend/scripts/cleanup-duplicates.ts
 */
import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config({ path: 'backend/.env' });

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@bmi.edu';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || '';

async function main() {
  const pb = new PocketBase(PB_URL);

  console.log('Authenticating as PocketBase admin...');
  // PB 0.22 uses direct HTTP for admin auth
  const response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Admin auth failed: ${err}`);
  }

  const authData: any = await response.json();
  pb.authStore.save(authData.token, authData.admin);
  console.log('Authenticated ✓\n');

  // Order matters: delete dependents first
  const collectionsToClean = [
    'program_courses',
    'enrollments',
    'grades',
    'students',
    'staff',
    'courses',
    'programs',
    'departments',
    'faculties',
    'library_items',
    'transactions',
  ];

  for (const col of collectionsToClean) {
    try {
      const records = await pb.collection(col).getFullList();
      if (records.length === 0) {
        console.log(`  ${col}: empty ✓`);
        continue;
      }
      console.log(`  ${col}: deleting ${records.length} records...`);
      for (const r of records) {
        try {
          await pb.collection(col).delete(r.id);
        } catch (e: any) {
          console.warn(`    Could not delete ${r.id}: ${e.message}`);
        }
      }
      console.log(`  ${col}: done ✓`);
    } catch (e: any) {
      console.warn(`  ${col}: ${e.message || e}`);
    }
  }

  console.log('\n✓ Cleanup complete. Restart backend to re-seed with clean data.');
}

main().catch(console.error);
