// List all PocketBase collections

import dotenv from 'dotenv';
dotenv.config({ path: `${process.cwd()}/backend/.env` });

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '').trim();

async function listCollections() {
  // Authenticate
  console.log('🔐 Authenticating...');
  const authResponse = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });
  
  if (!authResponse.ok) {
    console.error('❌ Authentication failed');
    process.exit(1);
  }
  
  const authData = await authResponse.json();
  const token = authData.token;
  console.log('✅ Authenticated\n');
  
  // List collections
  console.log('📋 Fetching collections...\n');
  const collectionsResponse = await fetch(`${PB_URL}/api/collections`, {
    headers: { 'Authorization': token },
  });
  
  if (!collectionsResponse.ok) {
    console.error('❌ Failed to fetch collections');
    process.exit(1);
  }
  
  const data = await collectionsResponse.json();
  const collections = data.items || [];
  
  console.log(`Found ${collections.length} collections:\n`);
  
  for (const collection of collections) {
    console.log(`📦 ${collection.name}`);
    console.log(`   ID: ${collection.id}`);
    console.log(`   Type: ${collection.type}`);
    console.log(`   Fields: ${collection.schema?.length || 0}`);
    if (collection.schema && collection.schema.length > 0) {
      console.log(`   Schema:`);
      collection.schema.forEach((field: any) => {
        console.log(`     - ${field.name} (${field.type})${field.required ? ' *required' : ''}`);
      });
    }
    console.log('');
  }
  
  // Check for students and exams specifically
  const hasStudents = collections.some((c: any) => c.name === 'students');
  const hasExams = collections.some((c: any) => c.name === 'exams');
  
  console.log('\n📊 Import Requirements:');
  console.log(`   students collection: ${hasStudents ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`   exams collection: ${hasExams ? '✅ EXISTS' : '❌ MISSING'}`);
  
  if (!hasStudents || !hasExams) {
    console.log('\n⚠️  Missing collections! Please create them in PocketBase Admin UI:');
    console.log('   1. Open http://localhost:8090/_/');
    console.log('   2. Login with admin@bmi.edu / <your-admin-password>');
    console.log('   3. Go to Collections');
    console.log('   4. Create the missing collections');
  }
}

listCollections().catch(console.error);
