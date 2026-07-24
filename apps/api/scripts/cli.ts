import { execSync } from 'child_process';
import path from 'path';

const command = process.argv[2];
const args = process.argv.slice(3).join(' ');

const scriptsDir = __dirname;

const commands: Record<string, { file: string, desc: string }> = {
  'gen-admin': { file: 'gen-admin-hash.mjs', desc: 'Generate a bcrypt hash for admin' },
  'seed': { file: 'generate-seed.mjs', desc: 'Generate seed data' },
  'load-test': { file: 'load-test.js', desc: 'Run k6 load tests' },
  'reset-admin': { file: 'reset-admin-worker.ts', desc: 'Reset admin worker' },
  'verify-migrations': { file: 'verify-migrations.ts', desc: 'Verify migrations' },
  'test-perf': { file: 'test-performance.ts', desc: 'Run performance tests' },
  'test-regno': { file: 'test_regno_concurrency.ts', desc: 'Test registration number concurrency' }
};

if (!command || !commands[command]) {
  console.log('BMI System API CLI');
  console.log('Usage: npm run cli <command> [args]');
  console.log('\nAvailable commands:');
  for (const [cmd, info] of Object.entries(commands)) {
    console.log(`  ${cmd.padEnd(20)} - ${info.desc}`);
  }
  process.exit(1);
}

const scriptData = commands[command];
const scriptPath = path.join(scriptsDir, scriptData.file);

try {
  let execCmd = '';
  if (scriptData.file.endsWith('.ts')) {
    execCmd = `npx tsx ${scriptPath} ${args}`;
  } else {
    execCmd = `node ${scriptPath} ${args}`;
  }
  
  console.log(`Running: ${execCmd}`);
  execSync(execCmd, { stdio: 'inherit' });
} catch (error) {
  console.error(`Error executing ${command}`);
  process.exit(1);
}
