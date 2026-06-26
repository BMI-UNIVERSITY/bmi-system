#!/usr/bin/env tsx
/**
 * Fix the students collection schema by adding missing fields
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

async function fixStudentsSchema() {
  console.log('🔧 Fixing Students Collection Schema...\n');
  
  const pb = new PocketBase(POCKETBASE_URL);
  pb.autoCancellation(false);
  
  try {
    // Authenticate
    console.log('1️⃣ Authenticating...');
    const authResponse = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });
    
    if (!authResponse.ok) {
      throw new Error('Authentication failed');
    }
    
    const authData = await authResponse.json();
    pb.authStore.save(authData.token, authData.admin);
    console.log('✅ Authenticated\n');
    
    // Get current collection
    console.log('2️⃣ Getting current schema...');
    const collection = await pb.collections.getOne('students');
    const existingFields = collection.schema?.map((f: any) => f.name) || [];
    console.log(`   Current fields: ${existingFields.join(', ')}\n`);
    
    // Define missing fields
    const fieldsToAdd = [
      {
        name: 'studentId',
        type: 'text',
        required: false,
        options: { min: null, max: null, pattern: '' }
      },
      {
        name: 'admissionYear',
        type: 'text',
        required: false,
        options: { min: null, max: null, pattern: '' }
      },
      {
        name: 'enrollmentTerm',
        type: 'text',
        required: false,
        options: { min: null, max: null, pattern: '' }
      },
      {
        name: 'standing',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: ['Honor Roll', 'Good', 'Probation', 'Warning']
        }
      },
      {
        name: 'gpa',
        type: 'number',
        required: false,
        options: { min: 0, max: 4, noDecimal: false }
      },
      {
        name: 'avatarColor',
        type: 'text',
        required: false,
        options: { min: null, max: null, pattern: '' }
      },
      {
        name: 'photoZoom',
        type: 'number',
        required: false,
        options: { min: null, max: null, noDecimal: false }
      },
      {
        name: 'photoPosition',
        type: 'json',
        required: false,
        options: { maxSize: 1000000 }
      },
      {
        name: 'photo',
        type: 'text',
        required: false,
        options: { min: null, max: null, pattern: '' }
      },
    ].filter(field => !existingFields.includes(field.name));
    
    if (fieldsToAdd.length === 0) {
      console.log('✅ All fields already exist!\n');
      return;
    }
    
    console.log('3️⃣ Adding missing fields:');
    fieldsToAdd.forEach(f => console.log(`   - ${f.name} (${f.type})`));
    console.log('');
    
    // Update collection schema
    const updatedSchema = [
      ...(collection.schema || []),
      ...fieldsToAdd,
    ];
    
    await pb.collections.update(collection.id, {
      schema: updatedSchema,
    });
    
    console.log('✅ Schema updated successfully!\n');
    
    // Verify
    const updated = await pb.collections.getOne('students');
    const newFields = updated.schema?.map((f: any) => f.name) || [];
    console.log('📋 Updated fields:');
    console.log(`   ${newFields.join(', ')}\n`);
    
    console.log('🎉 Students collection is now ready!');
    console.log('   You can now create students successfully.\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

fixStudentsSchema();
