#!/usr/bin/env tsx
/**
 * BMI UMS - Legacy Database Migration Script
 *
 * @deprecated Blocked by default. Canonical schema: backend/src/services/pocketbase.ts
 * (setupCollections on API startup). See docs/SCHEMA_SETUP.md
 *
 * To run this legacy script anyway (not recommended): ALLOW_LEGACY_POCKETBASE_MIGRATE=1
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@bmi.edu';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'admin123456';

const pb = new PocketBase(PB_URL);

const collections = [
  {
    name: 'users',
    type: 'auth',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'role', type: 'select', required: true, options: { values: ['admin', 'registrar', 'staff', 'viewer'] } },
      { name: 'department', type: 'text' },
      { name: 'isActive', type: 'bool', required: true },
      { name: 'lastLogin', type: 'date' },
    ],
    options: {
      allowEmailAuth: true,
      allowOAuth2Auth: true,
      requireEmail: true,
    },
  },
  {
    name: 'students',
    type: 'base',
    schema: [
      { name: 'firstName', type: 'text', required: true },
      { name: 'lastName', type: 'text', required: true },
      { name: 'middleName', type: 'text' },
      { name: 'gender', type: 'select', required: true, options: { values: ['Male', 'Female'] } },
      { name: 'email', type: 'email', required: true },
      { name: 'phone', type: 'text', required: true },
      { name: 'nationality', type: 'text' },
      { name: 'faculty', type: 'text', required: true },
      { name: 'department', type: 'text', required: true },
      { name: 'careerPath', type: 'text', required: true },
      { name: 'academicLevel', type: 'select', required: true, options: { values: ['Diploma', 'Degree', 'Masters', 'PhD'] } },
      { name: 'admissionYear', type: 'text', required: true },
      { name: 'enrollmentTerm', type: 'text', required: true },
      { name: 'status', type: 'select', required: true, options: { values: ['Active', 'Applicant', 'On Leave', 'Graduated', 'Suspended'] } },
      { name: 'standing', type: 'select', required: true, options: { values: ['Honor Roll', 'Good', 'Probation', 'Warning'] } },
      { name: 'gpa', type: 'number', required: true },
      { name: 'avatarColor', type: 'text', required: true },
      { name: 'photo', type: 'file' },
      { name: 'photoZoom', type: 'number' },
      { name: 'photoPosition', type: 'json' },
    ],
  },
  {
    name: 'staff',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'role', type: 'text', required: true },
      { name: 'department', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'phone', type: 'text', required: true },
      { name: 'status', type: 'select', required: true, options: { values: ['Full-time', 'Part-time', 'On Leave'] } },
      { name: 'category', type: 'select', required: true, options: { values: ['Academic', 'Administrative', 'Management'] } },
      { name: 'specialization', type: 'text', required: true },
      { name: 'office', type: 'text', required: true },
      { name: 'officeHours', type: 'text', required: true },
      { name: 'avatarColor', type: 'text', required: true },
      { name: 'photo', type: 'file' },
      { name: 'joinDate', type: 'date', required: true },
    ],
  },
  {
    name: 'courses',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'code', type: 'text', required: true },
      { name: 'faculty', type: 'text', required: true },
      { name: 'department', type: 'text', required: true },
      { name: 'level', type: 'select', required: true, options: { values: ['Undergraduate', 'Postgraduate', 'Diploma', 'Certificate'] } },
      { name: 'credits', type: 'number', required: true },
      { name: 'status', type: 'select', required: true, options: { values: ['Published', 'Draft', 'Archived'] } },
      { name: 'description', type: 'text', required: true },
      { name: 'syllabus', type: 'text', required: true },
    ],
  },
  {
    name: 'certificates',
    type: 'base',
    schema: [
      { name: 'serial_number', type: 'text', required: true },
      { name: 'student_id', type: 'relation', required: true, options: { collectionId: 'students', cascadeDelete: false } },
      { name: 'student_name', type: 'text', required: true },
      { name: 'degree', type: 'text', required: true },
      { name: 'graduation_class', type: 'text' },
      { name: 'faculty', type: 'text', required: true },
      { name: 'department', type: 'text', required: true },
      { name: 'issue_date', type: 'date', required: true },
      { name: 'graduation_date', type: 'date', required: true },
      { name: 'gpa', type: 'number', required: true },
      { name: 'status', type: 'select', required: true, options: { values: ['ISSUED', 'REVOKED', 'SUSPENDED'] } },
      { name: 'content_hash', type: 'text', required: true },
      { name: 'verification_count', type: 'number', required: true },
    ],
  },
  {
    name: 'transactions',
    type: 'base',
    schema: [
      { name: 'ref', type: 'text', required: true },
      { name: 'name', type: 'text', required: true },
      { name: 'desc', type: 'text', required: true },
      { name: 'amt', type: 'number', required: true },
      { name: 'status', type: 'select', required: true, options: { values: ['Paid', 'Pending', 'Failed'] } },
      { name: 'date', type: 'date', required: true },
      { name: 'student_id', type: 'relation', options: { collectionId: 'students', cascadeDelete: false } },
    ],
  },
  {
    name: 'library_items',
    type: 'base',
    schema: [
      { name: 'title', type: 'text', required: true },
      { name: 'author', type: 'text', required: true },
      { name: 'category', type: 'select', required: true, options: { values: ['Theology', 'ICT', 'Business', 'Education', 'General'] } },
      { name: 'type', type: 'select', required: true, options: { values: ['PDF', 'E-Book', 'Hardcopy', 'Journal', 'Video'] } },
      { name: 'status', type: 'select', required: true, options: { values: ['Digital', 'Available', 'Borrowed', 'Reserved'] } },
      { name: 'year', type: 'text', required: true },
      { name: 'description', type: 'text', required: true },
      { name: 'downloadUrl', type: 'url' },
      { name: 'location', type: 'text' },
      { name: 'isbn', type: 'text' },
    ],
  },
  {
    name: 'audit_logs',
    type: 'base',
    schema: [
      { name: 'action', type: 'select', required: true, options: { values: ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'VERIFY'] } },
      { name: 'resource', type: 'text', required: true },
      { name: 'resourceId', type: 'text' },
      { name: 'userId', type: 'text', required: true },
      { name: 'userEmail', type: 'text', required: true },
      { name: 'details', type: 'json' },
      { name: 'ipAddress', type: 'text', required: true },
      { name: 'userAgent', type: 'text' },
      { name: 'timestamp', type: 'date', required: true },
    ],
  },
];

async function migrate() {
  if (process.env.ALLOW_LEGACY_POCKETBASE_MIGRATE !== '1') {
    console.error(`
[DEPRECATED] scripts/migrate-db.ts

This script can create camelCase / flat schemas that conflict with the canonical
snake_case + relations model in backend/src/services/pocketbase.ts.

Use: start PocketBase → cd backend && npm run dev

Emergency only: ALLOW_LEGACY_POCKETBASE_MIGRATE=1 npx tsx scripts/migrate-db.ts
Docs: docs/SCHEMA_SETUP.md
`);
    process.exit(1);
  }

  console.warn('[WARN] Running legacy migrate-db.ts — schema may drift from canonical pocketbase.ts\n');

  console.log('🔧 BMI UMS Database Migration');
  console.log(`Connecting to PocketBase at ${PB_URL}...`);
  
  try {
    // Authenticate as admin
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated as admin');
    
    // Get existing collections
    const existingCollections = await pb.collections.getFullList();
    const existingNames = existingCollections.map(c => c.name);
    
    console.log(`Found ${existingCollections.length} existing collections`);
    
    // Create collections
    for (const collection of collections) {
      if (existingNames.includes(collection.name)) {
        console.log(`⏭️  Collection '${collection.name}' already exists`);
        continue;
      }
      
      try {
        await pb.collections.create(collection);
        console.log(`✅ Created collection: ${collection.name}`);
      } catch (error) {
        console.error(`❌ Failed to create collection '${collection.name}':`, error);
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Create an admin user at http://localhost:8090/_/');
    console.log('2. Start the API server: npm run dev');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();






