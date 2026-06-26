#!/usr/bin/env tsx
/**
 * Create Application Admin User in the users collection
 * This is different from the PocketBase admin
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'http://127.0.0.1:8090';
const POCKETBASE_ADMIN_EMAIL = 'admin@bmi.edu';
const POCKETBASE_ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

const APP_USER = {
  email: 'admin@bmi.edu',
  password: (process.env.POCKETBASE_ADMIN_PASSWORD ?? ''),
  passwordConfirm: (process.env.POCKETBASE_ADMIN_PASSWORD ?? ''),
  name: 'System Administrator',
  role: 'admin',
  department: 'IT Administration',
  isActive: true,
  verified: true,
  emailVisibility: false,
};

async function createAppAdminUser() {
  console.log('🔧 Creating Application Admin User...\n');
  
  const pb = new PocketBase(POCKETBASE_URL);
  pb.autoCancellation(false);
  
  try {
    // Step 1: Authenticate as PocketBase admin using direct HTTP call
    console.log('1️⃣ Authenticating as PocketBase admin...');
    const authResponse = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: POCKETBASE_ADMIN_EMAIL,
        password: POCKETBASE_ADMIN_PASSWORD,
      }),
    });
    
    if (!authResponse.ok) {
      const error = await authResponse.json();
      throw new Error(error.message || 'Authentication failed');
    }
    
    const authData = await authResponse.json();
    pb.authStore.save(authData.token, authData.admin);
    console.log('✅ PocketBase admin authenticated\n');
    
    // Step 2: Check if users collection exists
    console.log('2️⃣ Checking users collection...');
    let usersCollection;
    try {
      usersCollection = await pb.collections.getOne('users');
      console.log('✅ Users collection exists\n');
    } catch (error) {
      console.log('❌ Users collection does not exist!');
      console.log('   Creating users collection...\n');
      
      // Create users collection
      usersCollection = await pb.collections.create({
        name: 'users',
        type: 'auth',
        schema: [
          { name: 'name', type: 'text', required: true },
          { name: 'role', type: 'select', required: true, options: { values: ['admin', 'registrar', 'faculty', 'student', 'staff', 'viewer'] } },
          { name: 'department', type: 'text' },
          { name: 'studentId', type: 'text' },
          { name: 'staffId', type: 'text' },
          { name: 'isActive', type: 'bool', required: true },
          { name: 'lastLogin', type: 'date' },
        ],
        options: {
          allowEmailAuth: true,
          allowOAuth2Auth: false,
          allowUsernameAuth: false,
          requireEmail: true,
        },
      });
      console.log('✅ Users collection created\n');
    }
    
    // Step 3: Check if admin user already exists
    console.log('3️⃣ Checking if admin user exists...');
    const existingUsers = await pb.collection('users').getList(1, 50, {
      filter: `email = "${APP_USER.email}"`,
    });
    
    if (existingUsers.totalItems > 0) {
      const existingUser = existingUsers.items[0];
      console.log('⚠️  User already exists!');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Active: ${existingUser.isActive}\n`);
      
      // Check if role is correct
      if (existingUser.role !== 'admin' && existingUser.role !== 'registrar') {
        console.log(`⚠️  User role is '${existingUser.role}' but should be 'admin' or 'registrar'`);
        console.log('   Updating user to admin with all required fields...\n');
        
        await pb.collection('users').update(existingUser.id, {
          name: APP_USER.name,
          role: 'admin',
          department: APP_USER.department,
          isActive: true,
        });
        
        console.log('✅ User updated to admin with all required fields!\n');
      } else {
        console.log('✅ User has correct role!\n');
      }
      
      return;
    }
    
    // Step 4: Create admin user
    console.log('4️⃣ Creating admin user in users collection...');
    const newUser = await pb.collection('users').create(APP_USER);
    
    console.log('✅ Admin user created successfully!\n');
    console.log('📋 User Details:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Name: ${newUser.name}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Active: ${newUser.isActive}\n`);
    
    console.log('🎉 Setup complete! You can now log in with:');
    console.log(`   Email: ${APP_USER.email}`);
    console.log(`   Password: ${APP_USER.password}\n`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

createAppAdminUser();
