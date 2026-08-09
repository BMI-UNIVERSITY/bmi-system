#!/usr/bin/env node
/**
 * create-super-admin.mjs
 *
 * Secure CLI utility to provision the 1st Super Admin account for BMI System.
 * Uses the API endpoint `/api/admin/setup` with the `X-Admin-Setup-Key` header.
 *
 * Usage:
 *   node scripts/create-super-admin.mjs <admin-setup-key> [email] [password] [firstName] [lastName]
 *
 * Example:
 *   node scripts/create-super-admin.mjs my-secret-setup-key admin@bmiuniversities.org SuperPass123! Super Admin
 */

import fetch from 'node-fetch';

const API_URL = process.env.VITE_API_URL || 'https://bmi-api.bmi-university.workers.dev';
const setupKey = process.argv[2] || process.env.ADMIN_SETUP_KEY;
const email = process.argv[3] || 'admin@bmi.edu';
const password = process.argv[4] || 'AdminSuper2026!!';
const firstName = process.argv[5] || 'System';
const lastName = process.argv[6] || 'Administrator';

if (!setupKey) {
  console.error('\n❌ Missing ADMIN_SETUP_KEY.');
  console.error('Usage: node scripts/create-super-admin.mjs <admin-setup-key> [email] [password]\n');
  process.exit(1);
}

async function createSuperAdmin() {
  console.log('\n👑 BMI 1st Super Admin Account Provisioning');
  console.log('════════════════════════════════════════════');
  console.log(`🌐 API Endpoint: ${API_URL}/api/admin/setup`);
  console.log(`📧 Admin Email:  ${email}`);
  console.log(`👤 Name:         ${firstName} ${lastName}\n`);

  try {
    const res = await fetch(`${API_URL}/api/admin/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Setup-Key': setupKey,
      },
      body: JSON.stringify({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`❌ Setup Failed (HTTP ${res.status}):`, data.error || data);
      process.exit(1);
    }

    console.log('✅ Super Admin Account Successfully Created!');
    console.log('────────────────────────────────────────────');
    console.log(`  User ID: ${data.data?.user_id || data.user_id || 'Created'}`);
    console.log(`  Email:   ${email}`);
    console.log(`  Role:    admin (Executive Full Access)`);
    console.log('────────────────────────────────────────────\n');
  } catch (err) {
    console.error('❌ Network or Server Error:', err.message);
    process.exit(1);
  }
}

createSuperAdmin();
