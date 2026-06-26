/**
 * Diagnostic script to understand import issues
 */

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

async function diagnose() {
  console.log('🔍 Diagnostic Check');
  console.log('===================\n');
  
  // Step 1: Authenticate
  console.log('Step 1: Authenticating...');
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
    const error = await authResponse.json();
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }
  
  const authData = await authResponse.json();
  const token = authData.token;
  console.log('✅ Authenticated\n');
  
  // Step 2: Check students collection
  console.log('Step 2: Checking students collection...');
  const studentsResponse = await fetch(`${PB_URL}/api/collections/students/records?perPage=1`, {
    headers: { 'Authorization': token },
  });
  
  if (!studentsResponse.ok) {
    console.error('❌ Failed to fetch students');
    const error = await studentsResponse.json();
    console.error(JSON.stringify(error, null, 2));
  } else {
    const data = await studentsResponse.json();
    console.log(`✅ Students collection exists`);
    console.log(`   Total items: ${data.totalItems}`);
    console.log(`   Page: ${data.page}`);
    console.log(`   Per page: ${data.perPage}`);
    console.log(`   Total pages: ${data.totalPages}\n`);
  }
  
  // Step 3: Try to create a test student
  console.log('Step 3: Creating test student...');
  const testStudent = {
    id: 'TEST-BA226-00999',
    firstName: 'Test',
    lastName: 'Student',
    email: 'test.student@bmi.edu',
    phone: '+254700000000',
    gender: 'Male',
    nationality: 'Kenya',
    faculty: 'Theology',
    department: 'Biblical Studies',
    careerPath: 'Degree in Theology',
    academicLevel: 'Degree',
    admissionYear: '2025',
    enrollmentTerm: 'Fall 2024',
    status: 'Active',
    standing: 'Good',
    gpa: 0,
    avatarColor: 'bg-blue-600',
    photoZoom: 1,
  };
  
  const createResponse = await fetch(`${PB_URL}/api/collections/students/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
    body: JSON.stringify(testStudent),
  });
  
  const createData = await createResponse.json();
  
  if (!createResponse.ok) {
    console.error('❌ Failed to create test student');
    console.error(`   Status: ${createResponse.status}`);
    console.error(`   Response:`, JSON.stringify(createData, null, 2));
  } else {
    console.log('✅ Test student created successfully');
    console.log(`   ID: ${createData.id}`);
    console.log(`   Name: ${createData.firstName} ${createData.lastName}\n`);
    
    // Step 4: Verify it exists
    console.log('Step 4: Verifying test student exists...');
    const verifyResponse = await fetch(`${PB_URL}/api/collections/students/records?perPage=500`, {
      headers: { 'Authorization': token },
    });
    
    const verifyData = await verifyResponse.json();
    console.log(`✅ Total students now: ${verifyData.totalItems}`);
    
    // Step 5: Delete test student
    console.log('\nStep 5: Cleaning up test student...');
    const deleteResponse = await fetch(`${PB_URL}/api/collections/students/records/${createData.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': token },
    });
    
    if (deleteResponse.ok) {
      console.log('✅ Test student deleted\n');
    }
  }
  
  console.log('✅ Diagnostic complete');
}

diagnose().catch(console.error);
