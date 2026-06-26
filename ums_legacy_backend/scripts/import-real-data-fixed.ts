import * as fs from 'fs';
import * as path from 'path';
import XLSX from 'xlsx';

// ------------------------------------------------------------
// Configuration – update paths if you move the source files
// ------------------------------------------------------------
const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

// Absolute paths to the source spreadsheets (Windows paths are mounted under /mnt/c/...)
const STUDENT_XLSX_PATH = '/mnt/c/Users/nissi/Pictures/BMI UNIVERSITY 1 (1).xlsx';
const DIPLOMA_XLSX_PATH = '/mnt/c/Users/nissi/Pictures/DIPLOMA  Class Final GRADES .xlsx';
const TRANSCRIPT_CSV_PATH = '/mnt/c/Users/nissi/Pictures/diploma STUDENTS PERFORMANCE (TRANSCRIPT) - Sheet1.csv';

let authToken = '';

// ------------------------------------------------------------
// Raw API helpers (bypassing PocketBase SDK)
// ------------------------------------------------------------
async function authenticateAdmin() {
  const response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Auth failed: ${error.message}`);
  }
  
  const data = await response.json();
  authToken = data.token;
  return data;
}

async function createRecord(collection: string, data: any) {
  const response = await fetch(`${PB_URL}/api/collections/${collection}/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw error;
  }
  
  return await response.json();
}

// ------------------------------------------------------------
// Helper utilities
// ------------------------------------------------------------
function gradeFromScore(score: number): string {
  if (score >= 70) return 'A';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function sanitizeCourseCode(raw: string): string {
  // Turn "THE-101" or "Theology 101" into a safe code like THE-101
  return raw.replace(/\s+/g, '').replace(/[^A-Za-z0-9\-]/g, '').toUpperCase();
}

async function importStudentsFromXlsx(filePath: string) {
  console.log(`📥 Reading students from ${filePath}`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' }); // each row as object

  for (const row of rows) {
    const id = row['ADMISSION. NO'] || row['Admission No'] || row['ID'] || '';
    const fullName = (row['Student Name'] || row['Name'] || row['student name'] || '').toString().trim();
    const [firstName = '', lastName = ''] = fullName.split(/\s+/);
    const email = row['Email'] || '';
    const phone = row['Phone'] || row['PHONE NO.'] || '';
    const faculty = row['Faculty'] || row['Department'] || '';
    const department = row['Department'] || '';
    const careerPath = row['Career Path'] || '';
    const academicLevel = row['Academic Level'] || '';
    const yearOfStudy = Number(row['Year Of Study'] || row['Year'] || 0) || undefined;
    const enrollmentDate = row['Enrollment Date'] || '';
    const status = row['Status'] || 'Active';
    const gender = row['Gender'] || '';
    const nationality = row['Nationality'] || '';
    const dateOfBirth = row['Date of Birth'] || '';

    const studentPayload: any = {
      id,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      nationality,
      faculty,
      department,
      careerPath,
      academicLevel,
      yearOfStudy,
      enrollmentDate,
      status,
    };

    try {
      await createRecord('students', studentPayload);
      console.log(`   ✅ Created student ${id || fullName}`);
    } catch (e: any) {
      if (e.status === 400 && e.data?.id) {
        console.log(`   ⚠️  Student ${id} already exists – skipping`);
      } else {
        console.error(`   ❌ Error creating student ${id}:`, e.message || JSON.stringify(e));
      }
    }
  }
}

async function importExamsFromCsv(filePath: string) {
  console.log(`📥 Reading exam transcripts from ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    console.warn('   ⚠️  CSV appears empty or header‑only');
    return;
  }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const termCycle = ['Fall 2022', 'Spring 2023', 'Fall 2023', 'Spring 2024'];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length !== header.length) continue;
    const record: Record<string, string> = {};
    header.forEach((key, idx) => (record[key] = cols[idx].trim()));

    const studentId = record['admission. no'] || record['admission no'] || record['id'] || '';
    if (!studentId) continue;

    const studentFields = new Set(['student name', 'admission. no', 'phone no.', 'admission no', 'id', 'phone', 'email']);
    let subjectIdx = 0;
    for (const key of header) {
      if (studentFields.has(key)) continue;
      const rawScore = record[key];
      if (!rawScore) continue;
      const scoreMatch = rawScore.match(/(\d+)/);
      if (!scoreMatch) continue;
      const score = parseInt(scoreMatch[1], 10);
      const grade = gradeFromScore(score);
      const term = termCycle[Math.floor(subjectIdx / 5) % termCycle.length];
      const courseCode = sanitizeCourseCode(key);

      const examPayload = {
        studentId,
        courseCode,
        courseName: key,
        term,
        score,
        grade,
        credits: 45,
        examDate: new Date().toISOString().split('T')[0],
      };

      try {
        await createRecord('exams', examPayload);
        console.log(`   ✅ Added exam ${courseCode} for ${studentId}`);
      } catch (e: any) {
        console.error(`   ❌ Error adding exam ${courseCode} for ${studentId}:`, e.message || JSON.stringify(e));
      }
      subjectIdx++;
    }
  }
}

async function main() {
  try {
    console.log('🔐 Authenticating as admin...');
    await authenticateAdmin();
    console.log('✅ Authenticated');

    await importStudentsFromXlsx(STUDENT_XLSX_PATH);
    await importStudentsFromXlsx(DIPLOMA_XLSX_PATH);
    await importExamsFromCsv(TRANSCRIPT_CSV_PATH);

    console.log('\n🎉 Real data import complete!');
  } catch (err: any) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
