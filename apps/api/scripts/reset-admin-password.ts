import { createCoreDb } from '../lib/db';
import { users } from '../schema/core';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../../packages/api-middleware/src/jwt';

async function main() {
  const newEmail = process.argv[2] || 'admin@bmiuniversities.org';
  const newPassword = process.argv[3] || 'AdminSuper2026!!';
  const pepper = 'V1ZJ_yixtdYBbRVBeH9_aDztWWBX5Vs7yULNOuzI-kYhgq2WI_Je8Ez0H-PrS0eL';

  console.log(`\n🔑 Resetting Admin Account Credentials in Neon DB...`);
  console.log(`  Email:    ${newEmail}`);
  console.log(`  Password: ${newPassword}`);

  const env = {
    DATABASE_URL_CORE: 'postgresql://neondb_owner:npg_SUgCwP8nLb1A@ep-delicate-term-aws0vuty.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require',
  };
  const db = createCoreDb(env as any);

  const passwordHash = await hashPassword(newPassword, pepper);

  await db.update(users)
    .set({
      email: newEmail.toLowerCase(),
      password_hash: passwordHash,
      is_verified: 1,
      role: 'admin',
    })
    .where(eq(users.id, 'admin-001'))
    .execute();

  console.log('✅ Admin Account Credentials Successfully Updated in Neon DB!\n');
}

main().catch(console.error);
