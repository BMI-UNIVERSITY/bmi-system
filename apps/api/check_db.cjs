const Database = require('better-sqlite3');
const path = require('path');

const dbDir = path.join(__dirname, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
const fs = require('fs');
const files = fs.readdirSync(dbDir).filter(f => f.endsWith('.sqlite') && !f.startsWith('metadata'));
console.log('DB files found:', files);

const dbPath = path.join(dbDir, files[0]);
console.log('Opening:', dbPath);
const db = new Database(dbPath);

console.log('\n=== Migrations Applied ===');
const migrations = db.prepare('SELECT * FROM _migrations ORDER BY id').all();
migrations.forEach(m => console.log(m.name, '-', m.applied_at));

console.log('\n=== Tables ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log(t.name));

console.log('\n=== Stats ===');
console.log('Users:', db.prepare('SELECT COUNT(*) as count FROM users').get().count);
console.log('Students:', db.prepare('SELECT COUNT(*) as count FROM students').get().count);
console.log('Applications:', db.prepare('SELECT COUNT(*) as count FROM applications').get().count);

console.log('\n=== Users ===');
const users = db.prepare('SELECT id, email, role, first_name, last_name, email_verified FROM users LIMIT 20').all();
users.forEach(u => console.log(JSON.stringify(u)));

console.log('\n=== Programs ===');
try {
  const progs = db.prepare('SELECT id, name, code, level FROM programs LIMIT 20').all();
  progs.forEach(p => console.log(JSON.stringify(p)));
} catch(e) { console.log('No programs table or error:', e.message); }

console.log('\n=== Students ===');
try {
  const students = db.prepare('SELECT id, user_id, student_id, first_name, last_name, email, program_id, status FROM students LIMIT 10').all();
  students.forEach(s => console.log(JSON.stringify(s)));
} catch(e) { console.log('No students table or error:', e.message); }

db.close();
