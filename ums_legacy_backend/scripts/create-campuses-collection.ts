#!/usr/bin/env tsx
/**
 * Create Campuses Collection in PocketBase
 */

const POCKETBASE_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

async function createCampusesCollection() {
  console.log('🏫 Creating Campuses Collection...\n');
  
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
    const token = authData.token;
    console.log('✅ Admin authenticated\n');
    
    // Create campuses collection
    console.log('2️⃣ Creating campuses collection...');
    
    const collectionSchema = {
      name: 'campuses',
      type: 'base',
      schema: [
        {
          name: 'name',
          type: 'text',
          required: true,
          options: {
            min: 1,
            max: 100,
          },
        },
        {
          name: 'code',
          type: 'text',
          required: true,
          options: {
            min: 1,
            max: 50,
          },
        },
        {
          name: 'location',
          type: 'text',
          required: true,
          options: {
            min: 1,
            max: 100,
          },
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: {
            maxSelect: 1,
            values: ['active', 'inactive'],
          },
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_campuses_name ON campuses (name)',
        'CREATE UNIQUE INDEX idx_campuses_code ON campuses (code)',
      ],
      listRule: '',
      viewRule: '',
      createRule: null,
      updateRule: null,
      deleteRule: null,
    };
    
    const createResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify(collectionSchema),
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.json();
      
      // Check if collection already exists
      if (error.message && error.message.includes('already exists')) {
        console.log('✅ Campuses collection already exists\n');
        return;
      }
      
      throw new Error(error.message || 'Failed to create collection');
    }
    
    const collection = await createResponse.json();
    console.log('✅ Campuses collection created successfully!\n');
    console.log(`   Collection ID: ${collection.id}`);
    console.log(`   Collection Name: ${collection.name}\n`);
    
    console.log('═══════════════════════════════════════════════════');
    console.log('🎉 COLLECTION CREATED!');
    console.log('═══════════════════════════════════════════════════');
    console.log('\nNext steps:');
    console.log('   1. Run: npx tsx scripts/setup-campuses.ts');
    console.log('   2. This will import the 7 campuses\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

createCampusesCollection();
