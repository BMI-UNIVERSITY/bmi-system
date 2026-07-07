const crypto = require('crypto');
const fs = require('fs');

const PEPPER = 'super_secret_pepper_for_local_dev_only_123';
const PASSWORD = 'LoadTest@1234';
const ITERATIONS = 100000;

async function hashPassword(password, pepper) {
  const salt = crypto.randomBytes(16);
  const pepperKey = await crypto.subtle.importKey(
    'raw', Buffer.from(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const pepperedPassword = await crypto.subtle.sign('HMAC', pepperKey, Buffer.from(password));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', pepperedPassword, { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, keyMaterial, 256
  );
  const saltHex = Buffer.from(salt).toString('hex');
  const hashHex = Buffer.from(hashBuffer).toString('hex');
  return 'pbkdf2:' + ITERATIONS + ':' + saltHex + ':' + hashHex;
}

async function main() {
  console.log('Generating password hash for all test users...');
  // All users share the same password so hash once
  const hash = await hashPassword(PASSWORD, PEPPER);
  console.log('Hash: ' + hash.substring(0, 40) + '...');

  const users = [];
  const lines = [];
  for (let i = 1; i <= 200; i++) {
    const email = 'loadtest-user-' + i + '@example.com';
    const userId = crypto.randomUUID();
    const line = [
      "INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name, role, is_verified, created_at, updated_at)",
      "VALUES ('" + userId + "', '" + email + "', '" + hash + "', 'Load', 'User" + i + "', 'applicant', 1, datetime('now'), datetime('now'));"
    ].join('\n  ');
    lines.push(line);
    users.push({ email: email, password: PASSWORD });
  }

  fs.writeFileSync('seed-users.sql', lines.join('\n') + '\n');
  fs.writeFileSync('test-users.json', JSON.stringify(users, null, 2));
  console.log('Written seed-users.sql (' + lines.length + ' statements)');
  console.log('Written test-users.json (' + users.length + ' users)');
}

main().catch(console.error);
