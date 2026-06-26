#!/usr/bin/env tsx
/**
 * Setup Campuses Collection and Import Campus Data
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

interface Campus {
  name: string;
  code: string;
  location: string;
  status: 'active' | 'inactive';
}

const CAMPUSES: Campus[] = [
  {
    name: 'Kiambu Campus',
    code: 'KIAMBU',
    location: 'Kiambu',
    status: 'active',
  },
  {
    name: 'Mukurweini Campus',
    code: 'MUKURWEINI',
    location: 'Mukurweini',
    status: 'active',
  },
  {
    name: 'Giathugu Campus',
    code: 'GIATHUGU',
    location: 'Giathugu',
    status: 'active',
  },
  {
    name: 'Karatina 1 Campus',
    code: 'KARATINA1',
    location: 'Karatina',
    status: 'active',
  },
  {
    name: 'Karatina 2 Campus',
    code: 'KARATINA2',
    location: 'Karatina',
    status: 'active',
  },
  {
    name: 'Othaya Campus',
    code: 'OTHAYA',
    location: 'Othaya',
    status: 'active',
  },
  {
    name: 'Nyeri Campus',
    code: 'NYERI',
    location: 'Nyeri',
    status: 'active',
  },
];

async function setupCampuses() {
  console.log('🏫 Setting up Campuses System...\n');
  
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
    
    // Check if campuses collection exists
    console.log('2️⃣ Checking campuses collection...');
    try {
      await pb.collection('campuses').getList(1, 1);
      console.log('✅ Campuses collection exists\n');
    } catch (error: any) {
      if (error.status === 404) {
        console.log('⚠️  Campuses collection does not exist!');
        console.log('   Please create it manually in PocketBase Admin UI:\n');
        console.log('   1. Open http://127.0.0.1:8090/_/');
        console.log('   2. Go to Collections → New Collection');
        console.log('   3. Name: campuses');
        console.log('   4. Type: Base');
        console.log('   5. Add fields:');
        console.log('      - name (text, required, unique)');
        console.log('      - code (text, required, unique)');
        console.log('      - location (text, required)');
        console.log('      - status (select, required, options: active, inactive)');
        console.log('\n   Then run this script again.\n');
        process.exit(1);
      }
      throw error;
    }
    
    // Clear existing campuses
    console.log('3️⃣ Clearing existing campuses...');
    const existing = await pb.collection('campuses').getFullList();
    for (const campus of existing) {
      await pb.collection('campuses').delete(campus.id);
    }
    console.log(`✅ Cleared ${existing.length} existing campuses\n`);
    
    // Import campuses
    console.log('4️⃣ Importing campuses...');
    const imported: any[] = [];
    
    for (const campus of CAMPUSES) {
      try {
        const record = await pb.collection('campuses').create(campus);
        imported.push(record);
        console.log(`   ✓ ${campus.name} (${campus.code})`);
      } catch (error: any) {
        console.error(`   ✗ Failed to import ${campus.name}:`, error.message);
      }
    }
    
    console.log(`\n✅ Imported ${imported.length}/${CAMPUSES.length} campuses\n`);
    
    // Display summary
    console.log('═══════════════════════════════════════════════════');
    console.log('🎉 CAMPUSES SETUP COMPLETE!');
    console.log('═══════════════════════════════════════════════════');
    console.log('\nCampuses in system:');
    imported.forEach((campus, index) => {
      console.log(`   ${index + 1}. ${campus.name} (${campus.code}) - ${campus.location}`);
    });
    console.log('\n✅ Ready to assign students and staff to campuses!\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

setupCampuses();
