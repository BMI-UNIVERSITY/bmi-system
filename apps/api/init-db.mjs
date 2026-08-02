import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Use sql.js to open the database
const initSqlJs = await (async () => {
  // Try to dynamically import sql.js 
  try {
    const mod = await import('sql.js');
    return mod.default;
  } catch {
    console.error('sql.js not available. Trying better-sqlite3 rebuild...');
    process.exit(1);
  }
})();

console.log('initSqlJs loaded');
