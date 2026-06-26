#!/usr/bin/env tsx
/**
 * BMI UMS - Automatic Admin Account Creation
 * 
 * This script automatically creates an admin account in PocketBase
 */

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.ac.ke';
const ADMIN_PASSWORD = 'Admin@2025';

async function checkPocketBase() {
  console.log('🔍 Checking if PocketBase is running...');
  try {
    const response = await fetch(`${POCKETBASE_URL}/api/health`);
    if (response.ok) {
      console.log('✅ PocketBase is running\n');
      return true;
    }
  } catch (error) {
    console.log('❌ PocketBase is not running!');
    console.log('   Please start it first: npm start\n');
    return false;
  }
  return false;
}

async function checkAdminExists() {
  console.log('🔍 Checking if admin account exists...');
  try {
    const response = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (response.ok) {
      console.log('✅ Admin account already exists\n');
      return true;
    }
  } catch (error) {
    // Admin doesn't exist or wrong credentials
  }
  return false;
}

async function createAdmin() {
  console.log('👤 Creating admin account...');
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}\n`);

  try {
    // Try to create admin via API
    const response = await fetch(`${POCKETBASE_URL}/api/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        passwordConfirm: ADMIN_PASSWORD,
      }),
    });

    if (response.ok) {
      console.log('✅ Admin account created successfully!\n');
      return true;
    } else {
      const error = await response.json();
      console.log('⚠️  Could not create admin via API');
      console.log(`   Reason: ${error.message || response.statusText}\n`);
      return false;
    }
  } catch (error) {
    console.log('⚠️  Could not create admin via API');
    console.log(`   Error: ${error}\n`);
    return false;
  }
}

async function openAdminPanel() {
  console.log('🌐 Opening PocketBase Admin Panel...');
  console.log(`   URL: ${POCKETBASE_URL}/_/\n`);
  
  // Open browser on Windows
  const { exec } = await import('child_process');
  exec(`start ${POCKETBASE_URL}/_/`);
  
  console.log('📋 Please create the admin account manually:');
  console.log('   1. Click "Create your first admin"');
  console.log(`   2. Email: ${ADMIN_EMAIL}`);
  console.log(`   3. Password: ${ADMIN_PASSWORD}`);
  console.log(`   4. Password Confirm: ${ADMIN_PASSWORD}`);
  console.log('   5. Click "Create"\n');
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   BMI UMS - Create Admin Account                     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Check if PocketBase is running
  const isRunning = await checkPocketBase();
  if (!isRunning) {
    console.log('❌ Please start PocketBase first:');
    console.log('   npm start\n');
    process.exit(1);
  }

  // Check if admin already exists
  const adminExists = await checkAdminExists();
  if (adminExists) {
    console.log('✅ Admin account is ready!');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}\n`);
    console.log('You can now run the data restoration:');
    console.log('   .\\restore-data.bat\n');
    return;
  }

  // Try to create admin automatically
  const created = await createAdmin();
  
  if (!created) {
    // If automatic creation failed, open admin panel for manual creation
    await openAdminPanel();
    console.log('⏳ Waiting for you to create the admin account...');
    console.log('   Press Ctrl+C when done, then run this script again to verify.\n');
  } else {
    console.log('✅ Admin account is ready!');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}\n`);
    console.log('You can now run the data restoration:');
    console.log('   .\\restore-data.bat\n');
  }
}

main().catch (error);






