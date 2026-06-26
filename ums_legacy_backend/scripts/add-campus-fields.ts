#!/usr/bin/env tsx
/**
 * Add campus_code field to students, staff, and courses collections
 */

const POCKETBASE_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

const COLLECTIONS_TO_UPDATE = ['students', 'staff', 'courses'];

async function addCampusFields() {
  console.log('🔧 Adding campus fields to collections...\n');
  
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
    
    // Get campuses collection ID
    console.log('2️⃣ Getting campuses collection ID...');
    const collectionsResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
      headers: { 'Authorization': token },
    });
    
    if (!collectionsResponse.ok) {
      throw new Error('Failed to fetch collections');
    }
    
    const collectionsData = await collectionsResponse.json();
    const collections = Array.isArray(collectionsData) ? collectionsData : collectionsData.items || [];
    const campusesCollection = collections.find((c: any) => c.name === 'campuses');
    
    if (!campusesCollection) {
      throw new Error('Campuses collection not found!');
    }
    
    console.log(`✅ Campuses collection ID: ${campusesCollection.id}\n`);
    
    // Add campus_code field to each collection
    for (const collectionName of COLLECTIONS_TO_UPDATE) {
      console.log(`3️⃣ Updating ${collectionName} collection...`);
      
      // Get current collection schema
      const getResponse = await fetch(`${POCKETBASE_URL}/api/collections/${collectionName}`, {
        headers: { 'Authorization': token },
      });
      
      if (!getResponse.ok) {
        console.log(`   ⚠️  Collection ${collectionName} not found (skipping)\n`);
        continue;
      }
      
      const collection = await getResponse.json();
      
      // Check if campus_code field already exists
      const hasCampusField = collection.schema.some((field: any) => field.name === 'campus_code');
      
      if (hasCampusField) {
        console.log(`   ✓ campus_code field already exists\n`);
        continue;
      }
      
      // Add campus_code field
      const newField = {
        name: 'campus_code',
        type: 'relation',
        required: false,
        options: {
          collectionId: campusesCollection.id,
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ['name', 'code'],
        },
      };
      
      collection.schema.push(newField);
      
      // Update collection
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
        const error = await updateResponse.json();
        console.error(`   ✗ Failed to update ${collectionName}:`, error.message);
        continue;
      }
      
      console.log(`   ✓ Added campus_code field to ${collectionName}\n`);
    }
    
    console.log('═══════════════════════════════════════════════════');
    console.log('🎉 CAMPUS FIELDS ADDED!');
    console.log('═══════════════════════════════════════════════════');
    console.log('\nUpdated collections:');
    console.log('   ✓ students.campus_code (relation to campuses)');
    console.log('   ✓ staff.campus_code (relation to campuses)');
    console.log('   ✓ courses.campus_code (relation to campuses)');
    console.log('\n✅ Ready to assign records to campuses!\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

addCampusFields();
