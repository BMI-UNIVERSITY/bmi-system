/**
 * Fix the students collection schema to remove min constraint
 */

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

async function fixSchema() {
  console.log('🔧 Fixing Students Collection Schema');
  console.log('=====================================\n');
  
  // Authenticate
  console.log('🔐 Authenticating...');
  const authResponse = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
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
  console.log('✅ Authenticated\n');
  
  // Get current collection
  console.log('📋 Fetching current schema...');
  const getResponse = await fetch(`${PB_URL}/api/collections/students`, {
    headers: { 'Authorization': authData.token },
  });
  
  if (!getResponse.ok) {
    console.error('❌ Failed to fetch collection');
    process.exit(1);
  }
  
  const collection = await getResponse.json();
  console.log('✅ Current schema fetched\n');
  
  // Update the schema to remove min/max constraints on id field
  console.log('🔧 Updating schema...');
  
  // Find and update the id field
  const updatedSchema = collection.schema.map((field: any) => {
    if (field.name === 'id') {
      return {
        ...field,
        min: 0,
        max: 50,
        pattern: '',
        autogeneratePattern: ''
      };
    }
    return field;
  });
  
  const updateResponse = await fetch(`${PB_URL}/api/collections/${collection.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authData.token,
    },
    body: JSON.stringify({
      schema: updatedSchema
    }),
  });
  
  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    console.error('❌ Failed to update schema');
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }
  
  console.log('✅ Schema updated successfully!\n');
  console.log('📊 ID field now accepts 0-50 characters');
  console.log('');
  console.log('You can now run the import:');
  console.log('  bash scripts/fresh-import.sh');
}

fixSchema().catch(console.error);
