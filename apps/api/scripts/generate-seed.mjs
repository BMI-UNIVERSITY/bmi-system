import crypto from 'crypto';
import fs from 'fs';

async function hashPassword(password, pepper) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const pepperKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const pepperedPassword = await crypto.subtle.sign('HMAC', pepperKey, new TextEncoder().encode(password));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pepperedPassword,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 50000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${saltHex}:${hashHex}`;
}

async function run() {
  const pepper = process.env.JWT_SECRET || 'dev_secret_key_change_me_in_prod';
  const email = 'superadmin@bmi.edu';
  const password = 'SuperAdmin!2026';
  
  const hash = await hashPassword(password, pepper);
  const id = crypto.randomUUID();
  
  const sql = `
-- Wipe existing data
DELETE FROM password_reset_tokens;
DELETE FROM email_verifications;
DELETE FROM sessions;
DELETE FROM admin_audit_logs;
DELETE FROM application_status_logs;
DELETE FROM recommendation_requests;
DELETE FROM documents;
DELETE FROM applications;
DELETE FROM enrollments;
DELETE FROM courses;
DELETE FROM invoices;
DELETE FROM cms_pages;
DELETE FROM cms_posts;
DELETE FROM cms_media;
DELETE FROM student_settings;
DELETE FROM support_tickets;
DELETE FROM sync_event_log;
DELETE FROM webhook_dead_letters;
DELETE FROM students;
DELETE FROM staff;
DELETE FROM faculties;
DELETE FROM departments;
DELETE FROM programs;
DELETE FROM academic_terms;
DELETE FROM grades;
DELETE FROM certificates;
DELETE FROM users;

-- Insert SuperAdmin
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified)
VALUES ('${id}', '${email}', '${hash}', 'Super', 'Admin', 'admin', 1);
`;

  fs.writeFileSync('db/seed.sql', sql, 'utf8');
}

run();
