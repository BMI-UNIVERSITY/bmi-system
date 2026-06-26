#!/usr/bin/env tsx
/**
 * Clear ALL data from ALL collections in PocketBase
 * Preserves: Admin user only
 * Deletes: Everything else
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

const COLLECTIONS_TO_CLEAR = [
  'attendance_records',
  'visitors',
  'inventory_items',
  'medical_visits',
  'room_assignments',
  'hostels',
  'grading_scales',
  'grade_appeals',
  'audit_logs',
  'library_items',
  'transactions',
  'verification_logs',
  'certificates',
  'grades',
  'enrollments',
  'students',
  'staff',
  'program_courses',
  'courses',
  'programs',
  'departments',
  'faculties',
  'users', // Will preserve admin
];

async function clearAllData() {
  console.log('🗑️  CLEARING ALL DATA FROM DATABASE...\n');
  console.log('⚠️  This will delete ALL records from ALL collections!\n');
  
  const pb = new PocketBase(POCKETBASE_URL);
  pb.autoCancellation(false);
  
  try {
    // Authenticate as admin
    console.log('1️⃣ Authenticating as PocketBase admin...');
    const authResponse = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });
    
    if (!authResponse.ok) {
      const error = await authResponse.json();
      throw new Error(error.message || 'Authentication failed');
    }
    
    const authData = await authResponse.json();
    pb.authStore.save(authData.token, authData.admin);
    console.log('✅ Admin authenticated\n');
    
    let totalDeleted = 0;
    
    // Clear each collection
    for (const collectionName of COLLECTIONS_TO_CLEAR) {
      try {
        console.log(`📦 Clearing ${collectionName}...`);
        const records = await pb.collection(collectionName).getFullList();
        console.log(`   Found ${records.length} records`);
        
        if (records.length === 0) {
          console.log(`   ✓ Already empty\n`);
          continue;
        }
        
        // Special handling for users collection - preserve admin
        if (collectionName === 'users') {
          let deletedUsers = 0;
          for (const record of records) {
            if (record.email !== ADMIN_EMAIL) {
              await pb.collection(collectionName).delete(record.id);
              deletedUsers++;
            }
          }
          console.log(`   ✓ Deleted ${deletedUsers} users (preserved admin)`);
          totalDeleted += deletedUsers;
        } else {
          // Delete all records in other collections
          for (const record of records) {
            await pb.collection(collectionName).delete(record.id);
          }
          console.log(`   ✓ Deleted ${records.length} records`);
          totalDeleted += records.length;
        }
        
        console.log('');
        
      } catch (error: any) {
        if (error.status === 404) {
          console.log(`   ⚠️  Collection not found (skipping)\n`);
        } else {
          console.error(`   ❌ Error clearing ${collectionName}:`, error.message);
        }
      }
    }
    
    console.log('═══════════════════════════════════════════════════');
    console.log(`🎉 DATABASE CLEARED!`);
    console.log(`   Total records deleted: ${totalDeleted}`);
    console.log(`   Admin user preserved: ${ADMIN_EMAIL}`);
    console.log('═══════════════════════════════════════════════════\n');
    console.log('✅ Ready for fresh data import!\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

clearAllData();
