#!/usr/bin/env tsx
/**
 * BMI UMS - Sync PocketBase Data to Google Sheets
 * 
 * This script syncs all student, course, and academic data from PocketBase to Google Sheets
 */

import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg';

let authToken = '';
let sheetsAuth: JWT | null = null;

// Initialize Google Sheets Auth
function initGoogleAuth() {
  console.log('🔐 Initializing Google Sheets authentication...');
  
  const credsPath = path.join(process.cwd(), 'backend', 'google-credentials.json');
  
  if (!fs.existsSync(credsPath)) {
    throw new Error('Google credentials file not found at: ' + credsPath);
  }

  const credentials = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
  
  sheetsAuth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  console.log('✅ Google Sheets authentication initialized\n');
}

// Authenticate with PocketBase
async function authenticatePocketBase() {
  console.log('🔐 Authenticating with PocketBase...');
  
  const adminEmail = process.env.PB_ADMIN_EMAIL || 'admin@bmi.edu';
  const adminPassword = process.env.PB_ADMIN_PASSWORD || 'BMIAdmin2024Secure';

  try {
    const response = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: adminEmail,
        password: adminPassword,
      }),
    });

    if (!response.ok) {
      console.log('   ⚠️  Admin auth failed, trying regular user auth...');
      
      // Try regular user authentication
      const userResponse = await fetch(`${POCKETBASE_URL}/api/collections/users/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: adminEmail,
          password: adminPassword,
        }),
      });

      if (!userResponse.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${response.statusText}\nDetails: ${errorText}`);
      }

      const userData = await userResponse.json();
      authToken = userData.token;
      console.log('✅ PocketBase authentication successful (as user)\n');
      return;
    }

    const data = await response.json();
    authToken = data.token;
    console.log('✅ PocketBase authentication successful (as admin)\n');
  } catch (error) {
    console.error('❌ PocketBase authentication failed:', error);
    console.log('\n💡 Tip: Set your credentials as environment variables:');
    console.log('   $env:PB_ADMIN_EMAIL = "your-email@example.com"');
    console.log('   $env:PB_ADMIN_PASSWORD = "your-password"\n');
    throw error;
  }
}

// Fetch all records from a PocketBase collection
async function fetchAllRecords(collection: string) {
  console.log(`📥 Fetching ${collection} from PocketBase...`);
  
  const allRecords: any[] = [];
  let page = 1;
  const perPage = 500;

  while (true) {
    const response = await fetch(
      `${POCKETBASE_URL}/api/collections/${collection}/records?page=${page}&perPage=${perPage}&sort=created`,
      {
        headers: { Authorization: authToken },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ${collection}: ${response.statusText}`);
    }

    const data = await response.json();
    allRecords.push(...data.items);

    if (data.items.length < perPage) {
      break;
    }

    page++;
  }

  console.log(`   Found ${allRecords.length} records\n`);
  return allRecords;
}

// Clear and update a Google Sheet
async function updateSheet(sheetName: string, headers: string[], rows: any[][]) {
  console.log(`📝 Updating sheet: ${sheetName}...`);
  
  if (!sheetsAuth) {
    throw new Error('Google Sheets auth not initialized');
  }

  const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });

  try {
    // Check if sheet exists and get its metadata
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    const sheetExists = spreadsheet.data.sheets?.some(s => s.properties?.title === sheetName);
    
    if (!sheetExists) {
      console.warn(`   ⚠️  Sheet "${sheetName}" not found. Attempting to create it...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
              }
            }
          }]
        }
      });
      console.log(`   ✅ Created sheet: ${sheetName}`);
    }

    // Clear existing data - using A1:Z1000 instead of A:Z for better compatibility
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A1:Z5000`,
    });

    // Write headers and data
    const allData = [headers, ...rows];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: allData,
      },
    });

    console.log(`   ✅ Updated ${rows.length} rows in ${sheetName}\n`);
  } catch (error) {
    console.error(`   ❌ Failed to update sheet ${sheetName}:`, error.message);
    throw error;
  }
}

// Sync Students
async function syncStudents() {
  console.log('👨‍🎓 Syncing Students...\n');
  
  const students = await fetchAllRecords('students');
  const studyCenters = await fetchAllRecords('study_centers');
  
  // Create study center lookup
  const campusMap = new Map(studyCenters.map((c: any) => [c.id, c.name]));

  const headers = [
    'Student Code',
    'Reg No',
    'Full Name',
    'Gender',
    'Date of Birth',
    'Nationality',
    'Phone',
    'Email',
    'Admission No',
    'Admission Date',
    'Programme',
    'Status',
    'Campus',
  ];

  const rows = students.map((student: any) => [
    student.student_code || student.student_number || '',
    student.reg_no || '',
    student.full_name || '',
    student.gender || '',
    student.date_of_birth || '',
    student.nationality || '',
    student.phone || '',
    student.email || '',
    student.admission_no || '',
    student.admission_date || '',
    student.programme || '',
    student.status || '',
    campusMap.get(student.study_center_id) || '',
  ]);

  await updateSheet('07_STUDENTS', headers, rows);
}

// Sync Staff
async function syncStaff() {
  console.log('👨‍💼 Syncing Staff...\n');
  
  const staff = await fetchAllRecords('staff');

  const headers = [
    'Staff Number',
    'Full Name',
    'Role',
    'Department',
    'Email',
    'Status',
  ];

  const rows = staff.map((s: any) => [
    s.staff_number || '',
    s.full_name || s.name || '',
    s.role || '',
    s.department || '',
    s.email || '',
    s.status || '',
  ]);

  await updateSheet('06_STAFF', headers, rows);
}

// Sync Courses
async function syncCourses() {
  console.log('📖 Syncing Courses...\n');
  
  const courses = await fetchAllRecords('courses');
  const modules = await fetchAllRecords('modules');
  
  // Create module lookup
  const moduleMap = new Map(modules.map((m: any) => [m.id, m.name]));

  const headers = [
    'Course Code',
    'Title',
    'Category',
    'Credit Hours',
    'Module',
  ];

  const rows = courses.map((course: any) => [
    course.code || course.course_code || '',
    course.title || course.name || '',
    course.category || '',
    course.credit_hours || course.credits || '',
    moduleMap.get(course.module_id) || '',
  ]);

  await updateSheet('04_COURSES', headers, rows);
}

// Sync Academic Records (Grades)
async function syncAcademicRecords() {
  console.log('📊 Syncing Academic Records...\n');
  
  const records = await fetchAllRecords('academic_records');
  const students = await fetchAllRecords('students');
  const courses = await fetchAllRecords('courses');

  // Create lookups
  const studentMap = new Map(students.map((s: any) => [s.id, s.student_code || s.student_number]));
  const courseMap = new Map(courses.map((c: any) => [c.id, c.code || c.course_code]));

  const headers = [
    'Student Code',
    'Course Code',
    'Total Score',
    'CA Score',
    'Exam Score',
    'Grade',
    'Grade Point',
    'Remarks',
    'Academic Year',
  ];

  const rows = records.map((record: any) => [
    studentMap.get(record.student_id) || '',
    courseMap.get(record.course_id) || '',
    record.total_score || '',
    record.ca_score || '',
    record.exam_score || '',
    record.grade || '',
    record.grade_point || '',
    record.remarks || '',
    record.academic_year || '',
  ]);

  await updateSheet('09_GRADES', headers, rows);
}

// Sync Campuses (Study Centers)
async function syncCampuses() {
  console.log('🏫 Syncing Study Centers...\n');
  
  const studyCenters = await fetchAllRecords('study_centers');

  const headers = [
    'Name',
    'Location',
    'Status',
  ];

  const rows = studyCenters.map((campus: any) => [
    campus.name || '',
    campus.location || '',
    campus.status || '',
  ]);

  await updateSheet('01_CAMPUSES', headers, rows);
}

// Sync Modules
async function syncModules() {
  console.log('📚 Syncing Modules...\n');
  
  const modules = await fetchAllRecords('modules');

  const headers = [
    'Name',
    'Semester',
    'Sort Order',
  ];

  const rows = modules.map((module: any) => [
    module.name || '',
    module.semester || '',
    module.sort_order || '',
  ]);

  await updateSheet('02_MODULES', headers, rows);
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   BMI UMS - Sync to Google Sheets                    ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  try {
    // Initialize
    initGoogleAuth();
    await authenticatePocketBase();

    // Sync all data
    await syncCampuses();
    await syncModules();
    await syncCourses();
    await syncStaff();
    await syncStudents();
    await syncAcademicRecords();

    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   ✅ SYNC COMPLETE                                   ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    console.log('📊 Summary:');
    console.log('   - Study Centers synced to 01_CAMPUSES');
    console.log('   - Modules synced to 02_MODULES');
    console.log('   - Courses synced to 04_COURSES');
    console.log('   - Staff synced to 06_STAFF');
    console.log('   - Students synced to 07_STUDENTS');
    console.log('   - Academic Records synced to 09_GRADES\n');

    console.log('🌐 View your Google Sheet:');
    console.log(`   https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}\n`);

  } catch (error) {
    console.error('\n❌ Error during sync:', error);
    process.exit(1);
  }
}

main();






