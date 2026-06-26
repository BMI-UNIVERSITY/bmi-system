/**
 * BMI UMS - Clear Mock Data Script
 * Removes all students, courses, certificates, and exam collections
 * Use before importing real data
 */

import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env') });

const CONFIRMATION = 'DELETE-ALL-DATA';

async function main() {
  const confirmation = process.argv[2];
  
  // Use a fresh instance for the script context
  const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');

  // Explicitly authenticate as admin
  const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@bmi.edu';
  const adminPass = process.env.POCKETBASE_ADMIN_PASSWORD || 'admin123456';

  try {
    console.log(`🔐 Authenticating as ${adminEmail}...`);
    await pb.admins.authWithPassword(adminEmail, adminPass);
    console.log('✅ Authenticated successfully');
  } catch (err: any) {
    console.error('❌ Authentication failed:', err.message);
    process.exit(1);
  }
  
  console.log('BMI UMS - Clear Mock Data');
  console.log('========================\n');
  
  if (confirmation !== CONFIRMATION) {
    console.error('⚠️  WARNING: This will DELETE ALL DATA from the database!');
    console.error('\nTo proceed, run:');
    console.error(`  npx tsx scripts/clear-mock-data.ts ${CONFIRMATION}`);
    console.error('\nThis action cannot be undone. Export your data first if needed:');
    console.error('  npx tsx scripts/export-data.ts');
    process.exit(1);
  }
  
  console.log('Proceeding with data deletion...\n');
  
  // Define operations inside main to share the authenticated pb instance
  const clearCollection = async (collName: string) => {
    console.log(`Clearing ${collName}...`);
    try {
      const records = await pb.collection(collName).getFullList({ batch: 200 });
      for (const record of records) {
        await pb.collection(collName).delete(record.id);
      }
      console.log(`  ✓ Deleted ${records.length} ${collName}`);
      return records.length;
    } catch (err: any) {
      console.error(`  ✗ Failed to clear ${collName}:`, err.message);
      return 0;
    }
  };

  const students = await clearCollection('students');
  const courses = await clearCollection('courses');
  const certificates = await clearCollection('certificates');
  
  // Clear exam collections
  console.log('Clearing exam collections...');
  let examCount = 0;
  try {
    const collections = await pb.collections.getFullList();
    const examCollections = collections.filter(c => c.name.startsWith('exams_'));
    for (const collection of examCollections) {
      await pb.collections.delete(collection.id);
      console.log(`  ✓ Deleted collection ${collection.name}`);
      examCount++;
    }
  } catch (err: any) {
    console.error('  ✗ Failed to clear exam collections:', err.message);
  }
  
  console.log('\n========================');
  console.log('Deletion Summary:');
  console.log(`  Students deleted: ${students}`);
  console.log(`  Courses deleted: ${courses}`);
  console.log(`  Certificates deleted: ${certificates}`);
  console.log(`  Exam collections deleted: ${examCount}`);
  console.log('\nDatabase is now clean. Ready for real data import.');
}

main().catch(err => {
  console.error('Clear failed:', err);
  process.exit(1);
});
