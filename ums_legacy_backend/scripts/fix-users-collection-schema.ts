#!/usr/bin/env tsx
/**
 * Fix the users collection schema to add the role field
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

async function fixUsersCollectionSchema() {
  console.log('🔧 Fixing Users Collection Schema...\n');
  
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
    
    // Get users collection
    console.log('2️⃣ Getting users collection...');
    const collection = await pb.collections.getOne('users');
    console.log('✅ Users collection found\n');
    
    console.log('3️⃣ Current schema:');
    console.log(JSON.stringify(collection.schema, null, 2));
    console.log('');
    
    // Check if role field exists
    const hasRoleField = collection.schema?.some((field: any) => field.name === 'role');
    
    if (hasRoleField) {
      console.log('✅ Role field already exists!\n');
    } else {
      console.log('⚠️  Role field is missing! Adding it...\n');
      
      // Get existing field names
      const existingFieldNames = (collection.schema || []).map((f: any) => f.name);
      console.log('   Existing fields:', existingFieldNames.join(', '));
      console.log('');
      
      // Only add fields that don't exist
      const fieldsToAdd = [
        {
          name: 'role',
          type: 'select',
          required: true,
          options: {
            maxSelect: 1,
            values: ['admin', 'registrar', 'faculty', 'student', 'staff', 'viewer']
          }
        },
        {
          name: 'department',
          type: 'text',
          required: false,
        },
        {
          name: 'studentId',
          type: 'text',
          required: false,
        },
        {
          name: 'staffId',
          type: 'text',
          required: false,
        },
        {
          name: 'lastLogin',
          type: 'date',
          required: false,
        },
      ].filter(field => !existingFieldNames.includes(field.name));
      
      console.log('   Adding fields:', fieldsToAdd.map(f => f.name).join(', '));
      console.log('');
      
      // Update collection with existing + new fields
      const updatedSchema = [
        ...(collection.schema || []),
        ...fieldsToAdd,
      ];
      
      // Update collection
      await pb.collections.update(collection.id, {
        schema: updatedSchema,
      });
      
      console.log('✅ Missing fields added to users collection!\n');
    }
    
    // Now update the user's role
    console.log('4️⃣ Updating admin user role...');
    const users = await pb.collection('users').getList(1, 50, {
      filter: `email = "${ADMIN_EMAIL}"`,
    });
    
    if (users.totalItems > 0) {
      const user = users.items[0];
      await pb.collection('users').update(user.id, {
        role: 'admin',
        isActive: true,
      });
      console.log('✅ User role updated to admin!\n');
      
      // Verify
      const updatedUser = await pb.collection('users').getOne(user.id);
      console.log('📋 Updated User:');
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Name: ${updatedUser.name}`);
      console.log(`   Role: ${updatedUser.role}`);
      console.log(`   Active: ${updatedUser.isActive}\n`);
      
      console.log('🎉 Success! You can now log in and create students!');
    } else {
      console.log('❌ User not found!');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

fixUsersCollectionSchema();
