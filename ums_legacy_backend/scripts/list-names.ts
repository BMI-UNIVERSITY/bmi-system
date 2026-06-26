import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
dotenv.config({ path: `${process.cwd()}/backend/.env` });

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '').trim();

async function listNames() {
  const authResponse = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });
  const authData = await authResponse.json() as any;
  const collectionsResponse = await fetch(`${PB_URL}/api/collections`, {
    headers: { 'Authorization': authData.token },
  });
  const data = await collectionsResponse.json() as any;
  const ar = data.items.find((c: any) => c.name === 'academic_records');
  console.log('ACADEMIC RECORDS SCHEMA:', JSON.stringify(ar, null, 2));
}
listNames().catch(console.error);
