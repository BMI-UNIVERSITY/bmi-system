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

  // Remove `IDatabase` and `IPreparedStatement` from `@cloudflare/workers-types` imports
  const cloudflareRegex = /import type \{([^}]*)\} from '@cloudflare\/workers-types';/g;
  content = content.replace(cloudflareRegex, (match, p1) => {
    let parts = p1.split(',').map(s => s.trim()).filter(Boolean);
    parts = parts.filter(p => p !== 'IDatabase' && p !== 'IPreparedStatement' && p !== 'D1Database' && p !== 'D1PreparedStatement');
    if (parts.length === 0) return '';
    return `import type { ${parts.join(', ')} } from '@cloudflare/workers-types';`;
  });

  // Remove `IDatabase` and `IPreparedStatement` from `./types` or `../lib/types` imports
  const typesRegex = /import type \{([^}]*)\} from '(\.\.\/lib\/types|\.\/types)';/g;
  content = content.replace(typesRegex, (match, p1, p2) => {
    let parts = p1.split(',').map(s => s.trim()).filter(Boolean);
    parts = parts.filter(p => p !== 'IDatabase' && p !== 'IPreparedStatement');
    if (parts.length === 0) return '';
    return `import type { ${parts.join(', ')} } from '${p2}';`;
  });
  
  const typesRegex2 = /import \{([^}]*)\} from '(\.\.\/lib\/types|\.\/types)';/g;
  content = content.replace(typesRegex2, (match, p1, p2) => {
    let parts = p1.split(',').map(s => s.trim()).filter(Boolean);
    parts = parts.filter(p => p !== 'IDatabase' && p !== 'IPreparedStatement');
    if (parts.length === 0) return '';
    return `import { ${parts.join(', ')} } from '${p2}';`;
  });

  // Ensure there is exactly ONE import from @bmi/ports if used
  if (content.includes('IDatabase') || content.includes('IPreparedStatement')) {
    // replace all occurrences of it
    content = content.replace(/import type \{ IDatabase, IPreparedStatement \} from '@bmi\/ports';\n/g, '');
    content = content.replace(/import type \{ IDatabase \} from '@bmi\/ports';\n/g, '');
    // and just add one at the top
    content = `import type { IDatabase, IPreparedStatement } from '@bmi/ports';\n` + content;
  }

  // Check if changed
  const oldContent = fs.readFileSync(filePath, 'utf-8');
  if (content !== oldContent) {
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
