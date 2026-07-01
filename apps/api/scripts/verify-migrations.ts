import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

console.log('Verifying migrations...');

// Create a temporary directory for the sqlite DB
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmi-d1-verify-'));

try {
  // Run wrangler migrations apply against the temporary local directory
  // We pipe yes to it to bypass the "Are you sure?" prompt from wrangler
  const command = `npx wrangler d1 migrations apply bmi-portal-db --local --persist-to="${tempDir}"`;
  
  console.log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit', env: { ...process.env, CI: 'true' } });
  
  console.log('\n✅ Migrations verified successfully!');
} catch (error) {
  console.error('\n❌ Migration verification failed!');
  process.exit(1);
} finally {
  // Cleanup
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {
    console.error(`Failed to cleanup temporary directory: ${tempDir}`);
  }
}
