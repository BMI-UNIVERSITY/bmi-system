// Fix PocketBase collection permissions for students and exams

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

async function fixPermissions() {
  console.log('🔧 Fixing collection permissions...\n');
  
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
  
  // Get students collection
  console.log('📋 Fetching students collection...');
  const studentsResponse = await fetch(`${PB_URL}/api/collections/students`, {
    headers: { 'Authorization': token },
  });
  
  if (!studentsResponse.ok) {
    console.error('❌ Failed to fetch students collection');
    process.exit(1);
  }
  
  const studentsCollection = await studentsResponse.json();
  console.log('✅ Found students collection\n');
  
  // Update permissions to allow authenticated users to create/read/update
  console.log('🔓 Updating students collection permissions...');
  const updateResponse = await fetch(`${PB_URL}/api/collections/${studentsCollection.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
    body: JSON.stringify({
      listRule: '@request.auth.id != ""',  // Any authenticated user can list
      viewRule: '@request.auth.id != ""',  // Any authenticated user can view
      createRule: '@request.auth.id != ""', // Any authenticated user can create
      updateRule: '@request.auth.id != ""', // Any authenticated user can update
      deleteRule: '@request.auth.id != ""', // Any authenticated user can delete
    }),
  });
  
  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    console.error('❌ Failed to update permissions:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
  
  console.log('✅ Students collection permissions updated\n');
  
  // Do the same for exams collection
  console.log('📋 Fetching exams collection...');
  const examsResponse = await fetch(`${PB_URL}/api/collections/exams`, {
    headers: { 'Authorization': token },
  });
  
  if (examsResponse.ok) {
    const examsCollection = await examsResponse.json();
    console.log('✅ Found exams collection\n');
    
    console.log('🔓 Updating exams collection permissions...');
    const updateExamsResponse = await fetch(`${PB_URL}/api/collections/${examsCollection.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify({
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
      }),
    });
    
    if (!updateExamsResponse.ok) {
      const error = await updateExamsResponse.json();
      console.error('❌ Failed to update exams permissions:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Exams collection permissions updated\n');
    }
  }
  
  console.log('✅ All permissions fixed!');
  console.log('\nNow try creating a student again from the UI.');
}

fixPermissions().catch(console.error);
