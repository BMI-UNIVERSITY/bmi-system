async function main() {
  const authRes = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@bmi.edu', password: 'BMIAdmin2024Secure' })
  });
  const authData = await authRes.json();
  const token = authData.token;

  const recordsRes = await fetch('http://127.0.0.1:8090/api/collections/academic_records/records?perPage=2&expand=student_id,student_id.study_center_id,course_id,course_id.module_id', {
    headers: { 'Authorization': token }
  });
  const recordsData = await recordsRes.json();
  console.log(JSON.stringify(recordsData, null, 2));
}

main().catch(console.error);