#!/usr/bin/env tsx
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@bmi.edu';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'BMIAdmin2024Secure';

async function main() {
  console.log('🔧 Starting Students Status Schema migration...');
  
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

    // 2. Fetch students collection
    console.log('📦 Fetching students collection schema...');
    const collResponse = await fetch(`${POCKETBASE_URL}/api/collections/students`, {
      headers: { 'Authorization': token },
    });
    
    if (!collResponse.ok) {
      throw new Error('Failed to fetch students collection');
    }
    
    const collection = await collResponse.json();
    console.log(`✅ Students collection ID: ${collection.id}`);

    // 3. Find the status field and update its values
    const statusField = collection.schema.find((f: any) => f.name === 'status');
    if (!statusField) {
      throw new Error('Could not find status field in students collection schema');
    }

    console.log('Current status values:', statusField.options.values);
    
    // Add Applicant and On Leave if missing
    const requiredValues = ['Active', 'Inactive', 'Applicant', 'On Leave', 'Graduated', 'Suspended'];
    let changed = false;
    
    for (const val of requiredValues) {
      if (!statusField.options.values.includes(val)) {
        statusField.options.values.push(val);
        changed = true;
      }
    }

    if (changed) {
      console.log('New status values:', statusField.options.values);
      console.log('💾 Patching students collection schema...');
      
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
        const err = await updateResponse.json();
        throw new Error(`Failed to update schema: ${JSON.stringify(err)}`);
      }
      console.log('✅ Collection schema updated successfully.');
    } else {
      console.log('ℹ️ Status schema already contains all required values.');
    }

    console.log('🎉 Students status schema migration completed successfully!');
  } catch (error: any) {
    console.error('❌ Error during migration:', error.message);
    process.exit(1);
  }
}

main();
