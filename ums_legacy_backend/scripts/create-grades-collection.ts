/**
 * Create grades collection in PocketBase
 * Uses direct HTTP calls compatible with PocketBase 0.22+
 */

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

async function createGradesCollection() {
  try {
    // Authenticate as admin via direct HTTP (PocketBase 0.22 compatible)
    console.log('🔐 Authenticating as admin...');
    const authResponse = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    if (!authResponse.ok) {
      const err = await authResponse.json();
      throw new Error(`Auth failed: ${JSON.stringify(err)}`);
    }

    const authData = await authResponse.json();
    const token = authData.token;
    console.log('✓ Authenticated');

    // Check if grades collection already exists
    const collectionsResponse = await fetch(`${PB_URL}/api/collections/grades`, {
      headers: { 'Authorization': token },
    });

    if (collectionsResponse.ok) {
      console.log('⚠️  Grades collection already exists');
      console.log('✅ Nothing to do!');
      return;
    }

    // Create grades collection using PocketBase 0.22 schema format
    console.log('📝 Creating grades collection...');

    const collectionData = {
      name: 'grades',
      type: 'base',
      schema: [
        { name: 'studentId',   type: 'text',   required: true },
        { name: 'studentName', type: 'text',   required: true },
        { name: 'admissionNo', type: 'text',   required: true },
        { name: 'courseCode',  type: 'text',   required: true },
        { name: 'courseName',  type: 'text',   required: true },
        { name: 'grade',       type: 'number', required: true },
        { name: 'letterGrade', type: 'text',   required: true },
        { name: 'gpa',         type: 'number', required: true },
        { name: 'total',       type: 'number', required: true },
        { name: 'midterm',     type: 'number', required: false },
        { name: 'final',       type: 'number', required: false },
        { name: 'academicYear',type: 'text',   required: false },
        { name: 'semester',    type: 'text',   required: false },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: {
            maxSelect: 1,
            values: ['Pending Review', 'Verified', 'Flagged'],
          },
        },
        { name: 'createdAt',   type: 'text',   required: true },
        { name: 'updatedAt',   type: 'text',   required: true },
      ],
    };

    const createResponse = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify(collectionData),
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      throw new Error(`Failed to create collection: ${JSON.stringify(createData)}`);
    }

    console.log('✅ Grades collection created successfully!');
    console.log('');
    console.log('You can now:');
    console.log('  - Add grades through the UI at http://localhost:3000');
    console.log('  - View grades in PocketBase Admin: http://localhost:8090/_/');

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

createGradesCollection();
