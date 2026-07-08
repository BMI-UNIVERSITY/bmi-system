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

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  const replacePatterns = [
    { from: /\bD1Database\b/g, to: 'IDatabase' },
    { from: /\bD1PreparedStatement\b/g, to: 'IPreparedStatement' },
    { from: /import type \{([^}]*)\} from '@cloudflare\/workers-types'/g, to: (match, p1) => {
      // Remove D1 types from workers-types imports if possible, or just leave it
      return match;
    }},
    { from: /import type \{.*\} from '\.\/types';/g, to: (match) => {
       if(!match.includes('IDatabase')) return match.replace(/\} from/, ', IDatabase, IPreparedStatement } from');
       return match;
    }}
  ];

  for (const p of replacePatterns) {
    if (typeof p.to === 'string' && p.from.test(content)) {
      content = content.replace(p.from, p.to);
      changed = true;
    } else if (typeof p.to === 'function' && p.from.test(content)) {
      const newContent = content.replace(p.from, p.to);
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    }
  }
  
  // also inject import if IDatabase is used but not imported
  if (changed && !content.includes('import type { IDatabase') && !content.includes('import { IDatabase')) {
    content = `import type { IDatabase, IPreparedStatement } from '@bmi/ports';\n` + content;
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
  ...walk(path.join(apiDir, 'scripts')),
  path.join(apiDir, 'archival.ts'),
  path.join(apiDir, 'backup.ts'),
  path.join(apiDir, 'index.ts'),
];

for (const file of filesToProcess) {
  if (fs.existsSync(file)) {
    refactorFile(file);
  }
}
