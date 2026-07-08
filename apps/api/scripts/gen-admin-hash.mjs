// Run with: node gen-admin-hash.mjs <pepper> <password>
// Example: node gen-admin-hash.mjs "myPepperValue" "Admin@123"
// Then paste the output hash into the SQL command.

const pepper = process.argv[2] || '';
const password = process.argv[3] || 'Admin@123';

const { subtle, getRandomValues } = globalThis.crypto;

async function hashPassword(password, pepper) {
  const salt = getRandomValues(new Uint8Array(16));
  const pepperKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const pepperedPassword = await subtle.sign('HMAC', pepperKey, new TextEncoder().encode(password));
  const keyMaterial = await subtle.importKey('raw', pepperedPassword, { name: 'PBKDF2' }, false, ['deriveBits']);
  const iterations = 40000;
  const hashBuffer = await subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${iterations}:${saltHex}:${hashHex}`;
}

hashPassword(password, pepper).then(hash => {
  console.log('\nGenerated hash:');
  console.log(hash);
  console.log('\nRun this SQL to update the admin password:');
  console.log(`UPDATE users SET password_hash = '${hash}', updated_at = datetime('now') WHERE email = 'bmiuniversity8@gmail.com';`);
});
