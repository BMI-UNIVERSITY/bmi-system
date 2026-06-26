const PocketBase = require('pocketbase').default;
const pb = new PocketBase('http://127.0.0.1:8090');

async function checkRecordExists(collection, field, value) {
  try {
    const list = await pb.collection(collection).getList(1, 10, {
      filter: `${field} = "${value}"`
    });
    if (list.items.length > 0) {
      console.log(`✅ [FOUND] Collection "${collection}": ${field} = "${value}" (ID: ${list.items[0].id})`);
      return list.items[0];
    } else {
      console.error(`❌ [NOT FOUND] Collection "${collection}": ${field} = "${value}"`);
      return null;
    }
  } catch (e) {
    console.error(`❌ [ERROR] Failed to query ${collection}: ${e.message}`);
    return null;
  }
}

async function safeDelete(collection, field, value) {
  try {
    const list = await pb.collection(collection).getList(1, 50, {
      filter: `${field} = "${value}"`
    });
    for (const item of list.items) {
      console.log(`🗑️ Deleting from "${collection}": ${item.id} (${value})`);
      await pb.collection(collection).delete(item.id);
    }
  } catch (e) {
    console.error(`❌ Failed to delete from ${collection}: ${e.message}`);
  }
}

async function run() {
  await pb.collection('users').authWithPassword('admin@bmi.edu', 'BMIAdmin2024Secure');
  
  console.log('--- VERIFYING MOCK DATA FROM SHEETS WEBHOOK ---');
  
  const faculty = await checkRecordExists('faculties', 'faculty_code', 'FAC_MOCK_1');
  const dept = await checkRecordExists('departments', 'dept_code', 'DEPT_MOCK_1');
  const prog = await checkRecordExists('programs', 'program_code', 'PROG_MOCK_1');
  const course = await checkRecordExists('courses', 'course_code', 'CRS_MOCK_1');
  const staff = await checkRecordExists('staff', 'staff_number', 'STF_MOCK_1');
  const student = await checkRecordExists('students', 'student_number', 'STUD_MOCK_1');
  
  console.log('\n--- CLEANING UP MOCK DATA ---');
  
  // Clean up program courses if any
  try {
    const list = await pb.collection('program_courses').getList(1, 50, {
      filter: 'program_code.program_code = "PROG_MOCK_1"'
    });
    for (const pc of list.items) {
      console.log(`🗑️ Deleting program course: ${pc.id}`);
      await pb.collection('program_courses').delete(pc.id);
    }
  } catch (e) {}

  // Clean up enrollments & grades for STUD_MOCK_1
  try {
    const list = await pb.collection('enrollments').getList(1, 50, {
      filter: 'student_number.student_number = "STUD_MOCK_1"'
    });
    for (const en of list.items) {
      // Find grades
      try {
        const grades = await pb.collection('grades').getList(1, 50, {
          filter: `enrollment_id = "${en.id}"`
        });
        for (const g of grades.items) {
          console.log(`🗑️ Deleting grade: ${g.id}`);
          await pb.collection('grades').delete(g.id);
        }
      } catch (e) {}
      console.log(`🗑️ Deleting enrollment: ${en.id}`);
      await pb.collection('enrollments').delete(en.id);
    }
  } catch (e) {}

  // Deleting records bottom-up
  if (student) await safeDelete('students', 'student_number', 'STUD_MOCK_1');
  if (staff) await safeDelete('staff', 'staff_number', 'STF_MOCK_1');
  if (course) await safeDelete('courses', 'course_code', 'CRS_MOCK_1');
  if (prog) await safeDelete('programs', 'program_code', 'PROG_MOCK_1');
  if (dept) await safeDelete('departments', 'dept_code', 'DEPT_MOCK_1');
  if (faculty) await safeDelete('faculties', 'faculty_code', 'FAC_MOCK_1');
  
  console.log('\n🎉 Verification and cleanup completed successfully!');
}

run().catch(console.error);
