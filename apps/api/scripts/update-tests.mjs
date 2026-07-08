import fs from 'fs';
import path from 'path';

const apiDir = process.cwd();
const routesDir = path.join(apiDir, 'routes');

const testFiles = fs.readdirSync(routesDir)
  .filter(f => f.endsWith('.test.ts'))
  .map(f => path.join(routesDir, f));

// Also handle index.test.ts
testFiles.push(path.join(apiDir, 'index.test.ts'));

for (const file of testFiles) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  // Replace `{ DB: db as any } as any` with `makeEnv(db)`
  if (content.includes('{ DB: db as any } as any')) {
    content = content.replaceAll('{ DB: db as any } as any', 'makeEnv(db)');
    changed = true;
  }

  // Fix mutation of env.DB -> env.PLATFORM_CONTEXT.db
  if (content.includes('env.DB')) {
    content = content.replaceAll('env.DB', 'env.PLATFORM_CONTEXT.db');
    changed = true;
  }

  // Inject import if we changed something and import is not there yet
  if (changed && !content.includes('./test-helpers')) {
    content = `import { makeEnv } from './test-helpers';\n` + content;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}
