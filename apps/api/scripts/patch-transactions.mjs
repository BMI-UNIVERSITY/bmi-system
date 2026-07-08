/**
 * Patches local makeDB functions in test files to include `transaction` support.
 * This is needed because routes now use db.transaction() instead of db.batch().
 */
import fs from 'fs';
import path from 'path';

const apiDir = process.cwd();
const routesDir = path.join(apiDir, 'routes');

const testFiles = fs.readdirSync(routesDir)
  .filter(f => f.endsWith('.test.ts'))
  .map(f => path.join(routesDir, f));
testFiles.push(path.join(apiDir, 'index.test.ts'));

const transactionPatch = `    transaction: vi.fn().mockImplementation(async (cb: any) => {
      return await cb(db);
    }),`;

const transactionPatchNoDb = `    transaction: vi.fn().mockImplementation(async (cb: any) => {
      return await cb({ prepare: vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}) }) }) });
    }),`;

for (const file of testFiles) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  // Add `transaction` after `prepare: vi.fn()` in makeDB-style functions, if not already present
  // Pattern: look for prepare mocks inside local `db` objects
  // We only want to add if it's not there already
  if (!content.includes('transaction: vi.fn()')) {
    // For simple inline dbs: { prepare: vi.fn() }
    // We need to find places that end a db object literal with just `prepare:` chain and no transaction
    // Strategy: find `},\n  };\n` patterns that end db definitions
    
    // Instead, inject transaction into the db return values in makeChainDB-pattern functions
    // These use:  run: vi.fn().mockResolvedValue({})
    // followed by }, then }) closing the bind chain
    // We just inject transaction at the db level
    
    // Simpler: find lines like `const db = {` and add transaction after the closing `}`
    // This is too risky — let's patch at the makeDB/makeChainDB function definition level
    
    // Look for function bodies that return `{ prepare: ...}` objects
    // and inject transaction if missing
    if (content.includes("prepare: vi.fn()") && !content.includes("transaction: vi.fn()")) {
      // Find the pattern where db is defined as an object literal ending with:
      //     }),
      //   };
      // and the next line is a `const res = ...` or describe block
      // Instead of risky regex, let's add a wrapper helper in test-helpers
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}
