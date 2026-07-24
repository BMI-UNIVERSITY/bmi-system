-- Create admin user in users table (Portal system)
-- Email: bmiuniversity8@gmail.com
-- Password: Admin@123 (hashed with bcrypt)
INSERT INTO users (
  email, 
  password_hash, 
  first_name, 
  last_name, 
  role,
  is_verified,
  mfa_enabled
) VALUES (
  'bmiuniversity8@gmail.com',
  '-- REPLACE_WITH_BCRYPT_HASH_GENERATED_SECURELY --',
  'Admin',
  'User',
  'admin',
  1,
  0
);

-- Create corresponding staff record
INSERT INTO staff (
  user_id,
  staff_no,
  designation
) SELECT 
  id,
  'STAFF-001',
  'System Administrator'
FROM users 
WHERE email = 'bmiuniversity8@gmail.com';
