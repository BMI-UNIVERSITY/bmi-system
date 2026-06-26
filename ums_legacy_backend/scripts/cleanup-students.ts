import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

async function cleanupStudents() {
  console.log('🧹 Cleaning up students from other campuses...\n');
  
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  
  try {
    // Authenticate as admin using the working endpoint
    console.log('🔐 Authenticating...');
    const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    
    if (!authRes.ok) {
      throw new Error('Auth failed');
    }
    
    const authData: any = await authRes.json();
    pb.authStore.save(authData.token, authData.admin);
    console.log('✅ Authenticated\n');

    // 1. Get Campus IDs
    const campuses = await pb.collection('campuses').getFullList();
    const keepCampuses = campuses.filter(c => c.name === 'Mukurweini' || c.name === 'Giathugu');
    const keepIds = keepCampuses.map(c => c.id);
    
    console.log('📍 Campuses to keep:', keepCampuses.map(c => c.name).join(', '));
    console.log('   IDs:', keepIds.join(', '));

    // 2. Fetch all students
    const students = await pb.collection('students').getFullList();
    console.log(`\n👤 Total students: ${students.length}`);

    // 3. Filter and delete
    let deletedCount = 0;
    for (const student of students) {
      if (!keepIds.includes(student.campus_id)) {
        await pb.collection('students').delete(student.id);
        deletedCount++;
      }
    }
    
    console.log(`\n✅ Successfully deleted ${deletedCount} students from other campuses.`);
    
    // 4. Verify remaining
    const remaining = await pb.collection('students').getFullList();
    console.log(`👤 Remaining students: ${remaining.length}`);
    
  } catch (err: any) {
    console.error('\n❌ Error:', err.message);
    if (err.data) console.error(JSON.stringify(err.data, null, 2));
  }
}

cleanupStudents();
