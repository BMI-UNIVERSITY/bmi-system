#!/usr/bin/env tsx
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@bmi.edu';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'BMIAdmin2024Secure';

const CAMPUS_MAP: Record<string, { code: string; status: 'active' | 'inactive'; location: string }> = {
  'Kiambu': { code: 'KIAMBU', status: 'active', location: 'Kiambu' },
  'Mukurweini': { code: 'MUKURWEINI', status: 'active', location: 'Mukurweini' },
  'Giathugu': { code: 'GIATHUGU', status: 'active', location: 'Giathugu' },
  'Karatina A': { code: 'KARATINA1', status: 'active', location: 'Karatina' },
  'Karatina B': { code: 'KARATINA2', status: 'active', location: 'Karatina' },
  'Othaya': { code: 'OTHAYA', status: 'active', location: 'Othaya' },
  'Nyeri': { code: 'NYERI', status: 'active', location: 'Nyeri' },
};

async function main() {
  console.log('🔧 Starting Campuses Schema migration...');
  
  try {
    // 1. Authenticate as admin
    console.log('🔑 Authenticating as admin...');
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
      throw new Error(error.message || 'Admin authentication failed');
    }
    
    const authData = await authResponse.json();
    const token = authData.token;
    console.log('✅ Admin authenticated successfully.');

    // 2. Fetch campuses collection
    console.log('📦 Fetching campuses collection schema...');
    const collResponse = await fetch(`${POCKETBASE_URL}/api/collections/campuses`, {
      headers: { 'Authorization': token },
    });
    
    if (!collResponse.ok) {
      throw new Error('Failed to fetch campuses collection');
    }
    
    const collection = await collResponse.json();
    console.log(`✅ Campuses collection ID: ${collection.id}`);

    // 3. Add code and status fields if they are missing
    let updated = false;
    const hasCodeField = collection.schema.some((f: any) => f.name === 'code');
    const hasStatusField = collection.schema.some((f: any) => f.name === 'status');

    if (!hasCodeField) {
      console.log('➕ Adding code field...');
      collection.schema.push({
        name: 'code',
        type: 'text',
        required: false,
        options: {
          min: null,
          max: null,
          pattern: '',
        },
      });
      updated = true;
    }

    if (!hasStatusField) {
      console.log('➕ Adding status field...');
      collection.schema.push({
        name: 'status',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: ['active', 'inactive'],
        },
      });
      updated = true;
    }

    if (updated) {
      console.log('💾 Patching campuses collection schema...');
      const updateResponse = await fetch(`${POCKETBASE_URL}/api/collections/${collection.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
        },
        body: JSON.stringify({
          schema: collection.schema,
        }),
      });
      
      if (!updateResponse.ok) {
        const err = await updateResponse.ok ? null : await updateResponse.json();
        throw new Error(`Failed to update schema: ${JSON.stringify(err)}`);
      }
      console.log('✅ Collection schema updated successfully.');
    } else {
      console.log('ℹ️ Schema already up-to-date.');
    }

    // 4. Initialize PocketBase client to update records
    const pb = new PocketBase(POCKETBASE_URL);
    pb.authStore.save(token, authData.admin);

    // 5. Fetch and update existing campus records
    console.log('📝 Seeding code and status values...');
    const records = await pb.collection('campuses').getFullList();
    for (const record of records) {
      const match = CAMPUS_MAP[record.name];
      if (match) {
        console.log(`   Updating ${record.name} -> code: ${match.code}, status: ${match.status}, location: ${match.location}`);
        await pb.collection('campuses').update(record.id, {
          code: match.code,
          status: match.status,
          location: match.location || record.location || '',
        });
      } else {
        // Fallback for custom names
        console.log(`   ⚠️ Unknown campus ${record.name}, setting default code/status`);
        const fallbackCode = record.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        await pb.collection('campuses').update(record.id, {
          code: fallbackCode || 'CAMP',
          status: 'active',
        });
      }
    }

    console.log('🎉 Campuses Schema migration completed successfully!');
  } catch (error: any) {
    console.error('❌ Error during migration:', error.message);
    process.exit(1);
  }
}

main();
