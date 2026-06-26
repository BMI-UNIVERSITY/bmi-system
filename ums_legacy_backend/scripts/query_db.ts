import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = 'BMIAdmin2024Secure';

async function main() {
  const pb = new PocketBase(POCKETBASE_URL);
  pb.autoCancellation(false);

  const authResponse = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const authData = await authResponse.json();
  pb.authStore.save(authData.token, authData.admin);

  const studentId = '7zesvkc1bbxc2f6';
  const student = await pb.collection('students').getOne(studentId);
  console.log('STUDENT NAME:', student.first_name, student.last_name);

  const records = await pb.collection('academic_records').getList(1, 100, {
    filter: `student_id = "${studentId}"`,
  });
  console.log('ACADEMIC RECORDS COUNT:', records.totalItems);
  for (const r of records.items) {
    console.log('- Course:', r.course_id, 'Grade:', r.grade, 'Score:', r.total_score);
  }
}

main().catch(console.error);
