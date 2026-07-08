import fs from 'fs';
import path from 'path';

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  const replacePatterns = [
    { from: /env\.DB/g, to: 'env.PLATFORM_CONTEXT!.db' },
    { from: /env\.KV/g, to: 'env.PLATFORM_CONTEXT!.kv' },
    { from: /env\.WRITE_QUEUE/g, to: 'env.PLATFORM_CONTEXT!.writeQueue' },
    { from: /env\.QUEUE/g, to: 'env.PLATFORM_CONTEXT!.queue' },
    { from: /env\.EMAIL_QUEUE/g, to: 'env.PLATFORM_CONTEXT!.queue' },
    { from: /env\.RATE_LIMITER/g, to: 'env.PLATFORM_CONTEXT!.rateLimiter' }
  ];

  for (const p of replacePatterns) {
    if (p.from.test(content)) {
      content = content.replace(p.from, p.to);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
}

const apiDir = process.cwd();
const filesToProcess = [
  ...walk(path.join(apiDir, 'routes')),
  ...walk(path.join(apiDir, 'lib')),
  path.join(apiDir, 'archival.ts'),
  path.join(apiDir, 'backup.ts'),
  path.join(apiDir, 'index.ts'),
];

for (const file of filesToProcess) {
  if (fs.existsSync(file)) {
    refactorFile(file);
  }
}
