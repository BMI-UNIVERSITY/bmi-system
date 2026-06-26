#!/usr/bin/env tsx
/**
 * Clear all students and exams from the database
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

async function clearAllData() {
  console.log('🗑️  Clearing All Mock/Test Data...\n');
  
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
    
    // Clear students
    console.log('2️⃣ Deleting all students...');
    const students = await pb.collection('students').getFullList();
    console.log(`   Found ${students.length} students`);
    
    for (const student of students) {
      await pb.collection('students').delete(student.id);
      console.log(`   ✓ Deleted: ${student.firstName} ${student.lastName}`);
    }
    console.log(`✅ Deleted ${students.length} students\n`);
    
    // Clear exams
    console.log('3️⃣ Deleting all exams...');
    try {
      const exams = await pb.collection('exams').getFullList();
      console.log(`   Found ${exams.length} exams`);
      
      for (const exam of exams) {
        await pb.collection('exams').delete(exam.id);
      }
      console.log(`✅ Deleted ${exams.length} exams\n`);
    } catch (error: any) {
      if (error.status === 404) {
        console.log('   No exams collection found (skipping)\n');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 All mock/test data cleared!');
    console.log('   You can now start fresh with real data.\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

clearAllData();
