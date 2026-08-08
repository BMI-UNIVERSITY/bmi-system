import { Client } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const connectionString = 'postgresql://neondb_owner:npg_SUgCwP8nLb1A@ep-delicate-term-aws0vuty.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require';
  console.log('🔗 Connecting to Neon Database via Client...');
  const client = new Client(connectionString);
  await client.connect();

  const sqlFilePath = path.join(__dirname, '..', 'drizzle', 'rls_policies.sql');
  console.log(`📄 Reading RLS policies from ${sqlFilePath}...`);
  const rlsSql = fs.readFileSync(sqlFilePath, 'utf8');

  console.log('⚡ Applying policies...');
  await client.query(rlsSql);

  await client.end();
  console.log('✅ Row-Level Security policies applied successfully!');
}

main().catch((err) => {
  console.error('❌ Failed to apply RLS policies:', err);
  process.exit(1);
});
