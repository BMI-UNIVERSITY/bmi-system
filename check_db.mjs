import Database from 'better-sqlite3';

const dbPath = 'D:\\BMI\\apps\\api\\.wrangler\\state\\v3\\d1\\miniflare-D1DatabaseObject\\7f6218b9335b4d1b92cf410c8f21bc608819500496197a6762edadef45ea1c96.sqlite';
const db = new Database(dbPath);

console.log('=== Migrations Applied ===');
const migrations = db.prepare('SELECT * FROM _migrations ORDER BY id').all();
migrations.forEach(m => console.log(JSON.stringify(m)));

console.log('\n=== Tables ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log(t.name));

console.log('\n=== Users Count ===', db.prepare('SELECT COUNT(*) as count FROM users').get().count);

console.log('=== Students Count ===', db.prepare('SELECT COUNT(*) as count FROM students').get().count);

console.log('=== Applications Count ===', db.prepare('SELECT COUNT(*) as count FROM applications').get().count);

console.log('\n=== Users (first 10) ===');
const users = db.prepare('SELECT id, email, role, first_name, last_name, email_verified FROM users LIMIT 10').all();
users.forEach(u => console.log(JSON.stringify(u)));

console.log('\n=== Programs ===');
const progs = db.prepare('SELECT id, name, code, level FROM programs LIMIT 10').all();
progs.forEach(p => console.log(JSON.stringify(p)));

console.log('\n=== Students (first 5) ===');
const students = db.prepare('SELECT id, user_id, student_id, first_name, last_name, email, program_id, status FROM students LIMIT 5').all();
students.forEach(s => console.log(JSON.stringify(s)));

db.close();
