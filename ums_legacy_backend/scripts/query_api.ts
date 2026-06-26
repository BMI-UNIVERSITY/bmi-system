async function main() {
  const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bmi.edu', password: 'BMIAdmin2024Secure' })
  });
  const loginData = await loginRes.json() as any;
  if (!loginData.success) {
    console.error('Login failed:', loginData);
    return;
  }
  const token = loginData.data.token;
  console.log('Login successful, token retrieved.');

  const studentId = '7zesvkc1bbxc2f6';
  const gradesRes = await fetch(`http://localhost:3001/api/v1/grades?studentId=${studentId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const gradesData = await gradesRes.json() as any;
  console.log('API RESPONSE SUCCESS:', gradesData.success);
  if (gradesData.success) {
    console.log('API DATA ITEMS COUNT:', gradesData.data?.length);
    console.log('ITEMS:', JSON.stringify(gradesData.data, null, 2));
  } else {
    console.error('API ERROR:', gradesData.error);
  }
}

main().catch(console.error);
