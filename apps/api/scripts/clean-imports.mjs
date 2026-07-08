import fs from 'fs';
import path from 'path';

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Only remove IDatabase/IPreparedStatement if they're not actually used in the body (i.e., only in the header import)
  const headerLine = `import type { IDatabase, IPreparedStatement } from '@bmi/ports';\n`;
  if (!content.startsWith(headerLine)) return;
  
  const bodyWithoutHeader = content.slice(headerLine.length);
  const usesIDatabase = /\bIDatabase\b/.test(bodyWithoutHeader);
  const usesIPreparedStatement = /\bIPreparedStatement\b/.test(bodyWithoutHeader);
  
  let newImport = '';
  if (usesIDatabase && usesIPreparedStatement) {
    newImport = headerLine;
  } else if (usesIDatabase) {
    newImport = `import type { IDatabase } from '@bmi/ports';\n`;
  } else if (usesIPreparedStatement) {
    newImport = `import type { IPreparedStatement } from '@bmi/ports';\n`;
  } else {
    newImport = ''; // remove entirely
  }
  
  const newContent = newImport + bodyWithoutHeader;
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Cleaned ${filePath}`);
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
    cleanFile(file);
  }
}
