import PocketBase from 'pocketbase';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env') });

interface StudentRow {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  faculty?: string;
  department?: string;
  academicLevel?: string;
  admissionYear?: string;
  enrollmentTerm?: string;
  status?: string;
  middleName?: string;
  nationality?: string;
}

// Column mapping (case-insensitive)
const COLUMN_MAP: Record<string, keyof StudentRow> = {
  'first name': 'firstName',
  'firstname': 'firstName',
  'first_name': 'firstName',
  'given name': 'firstName',
  'last name': 'lastName',
  'lastname': 'lastName',
  'last_name': 'lastName',
  'surname': 'lastName',
  'family name': 'lastName',
  'name': 'firstName',
  'student name': 'firstName',
  'full name': 'firstName',
  'fullname': 'firstName',
  'studentname': 'firstName',
  'middle name': 'middleName',
  'middlename': 'middleName',
  'middle_name': 'middleName',
  'email': 'email',
  'email address': 'email',
  'phone': 'phone',
  'mobile': 'phone',
  'phone number': 'phone',
  'tel': 'phone',
  'gender': 'gender',
  'sex': 'gender',
  'faculty': 'faculty',
  'school': 'faculty',
  'college': 'faculty',
  'department': 'department',
  'dept': 'department',
  'program': 'department',
  'level': 'academicLevel',
  'academic level': 'academicLevel',
  'academic_level': 'academicLevel',
  'program level': 'academicLevel',
  'admission year': 'admissionYear',
  'year': 'admissionYear',
  'intake year': 'admissionYear',
  'admission_year': 'admissionYear',
  'term': 'enrollmentTerm',
  'enrollment term': 'enrollmentTerm',
  'enrollment_term': 'enrollmentTerm',
  'semester': 'enrollmentTerm',
  'status': 'status',
  'nationality': 'nationality',
  'country': 'nationality',
};

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[_\-]+/g, ' ');
}

function mapRow(rawRow: Record<string, any>): StudentRow {
  const result: Partial<StudentRow> = {};
  
  for (const [rawKey, value] of Object.entries(rawRow)) {
    if (value === undefined || value === null || value === '') continue;
    
    const normKey = normalizeKey(rawKey);
    const mappedKey = COLUMN_MAP[normKey];
    
    if (mappedKey) {
      result[mappedKey] = String(value).trim();
    }
  }
  
  // If we have a full name but missing last name, split it
  if (result.firstName && !result.lastName) {
    const parts = result.firstName.split(/\s+/);
    if (parts.length > 1) {
      result.firstName = parts[0];
      result.lastName = parts.slice(1).join(' ');
    } else {
      result.lastName = 'Student'; // Fallback
    }
  }
  
  // Ensure required fields exist
  if (!result.firstName) {
    throw new Error(`Missing required field: firstName`);
  }
  if (!result.lastName) {
    throw new Error(`Missing required field: lastName`);
  }
  
  // Auto-generate email if missing
  if (!result.email) {
    result.email = `${result.firstName.toLowerCase()}.${result.lastName.toLowerCase()}@bmi.edu`;
  }
  
  return result as StudentRow;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx scripts/import-students.ts <path-to-file.xlsx>');
    process.exit(1);
  }

  const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');

  // Explicitly authenticate as admin
  const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@bmi.edu';
  const adminPass = process.env.POCKETBASE_ADMIN_PASSWORD || 'admin123456';

  try {
    console.log(`🔐 Authenticating as ${adminEmail}...`);
    await pb.admins.authWithPassword(adminEmail, adminPass);
    console.log('✅ Authenticated successfully');
  } catch (err: any) {
    console.error('❌ Authentication failed:', err.message);
    process.exit(1);
  }

  console.log(`Reading file: ${filePath}\n`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  const data = fs.readFileSync(filePath);
  const workbook = XLSX.read(data, { type: 'buffer' });
  
  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  const errors: string[] = [];

  // Get existing students once
  const existingStudentsList = await pb.collection('students').getFullList({
    fields: 'email',
  });
  const existingEmails = new Set(existingStudentsList.map(s => s.email.toLowerCase()));

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    let rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    
    if (rawRows.length === 0) continue;

    console.log(`\n📄 Processing Sheet: ${sheetName} (${rawRows.length} rows)`);

    // Handle "diploma STUDENTS PERFORMANCE (TRANSCRIPT).xlsx" special format
    // Row 0 is "( diploma class)", Row 1 is actual data starts but headers were read from Row 0.
    // If headers look like [' ', 'ADMISSION. NO', ...], it's this file.
    const headers = Object.keys(rawRows[0]);
    const isDiplomaFile = headers.includes(' ') && headers.includes('ADMISSION. NO');

    if (isDiplomaFile) {
      console.log('  ℹ Detected Diploma Performance format - skipping first row');
      rawRows = rawRows.slice(1);
    }

    const avatarColors = ['bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600'];
    
    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + (isDiplomaFile ? 3 : 2);
      const rawRow = rawRows[i];

      try {
        const row = mapRow(rawRow);
        
        // Skip rows that mapped to empty names (common in junk sheets)
        if (!row.firstName || row.firstName === 'Unknown') {
          continue;
        }

        const emailLower = row.email.toLowerCase();
        
        if (existingEmails.has(emailLower)) {
          console.log(`    ⏭ Row ${rowNum}: Skipped (duplicate email: ${row.email})`);
          totalSkipped++;
          continue;
        }
        
        const gender = (row.gender?.toLowerCase() === 'female' ? 'Female' : 'Male') as 'Male' | 'Female';
        const validLevels = ['Diploma', 'Degree', 'Masters', 'PhD'];
        const academicLevel = (validLevels.includes(row.academicLevel || '') ? row.academicLevel : 'Degree') as 'Diploma' | 'Degree' | 'Masters' | 'PhD';
        const validStatuses = ['Active', 'Applicant', 'On Leave', 'Graduated', 'Suspended'];
        const status = (validStatuses.includes(row.status || '') ? row.status : 'Active') as 'Active' | 'Applicant' | 'On Leave' | 'Graduated' | 'Suspended';
        
        const studentData = {
          firstName: row.firstName,
          lastName: row.lastName,
          middleName: row.middleName || '',
          email: row.email,
          phone: row.phone || '+254 700 000 000',
          gender: gender,
          nationality: row.nationality || (sheetName !== 'Sheet1' ? sheetName : 'Kenyan'),
          faculty: row.faculty || 'General',
          department: row.department || 'General',
          careerPath: `${academicLevel} in ${row.faculty || 'General'}`,
          academicLevel: academicLevel,
          admissionYear: row.admissionYear || new Date().getFullYear().toString(),
          enrollmentTerm: row.enrollmentTerm || 'Fall 2024',
          status: status,
          standing: 'Good' as const,
          gpa: 0,
          avatarColor: avatarColors[totalImported % avatarColors.length],
          photoZoom: 1,
        };
        
        await pb.collection('students').create(studentData);
        existingEmails.add(emailLower);
        
        console.log(`    ✓ Row ${rowNum}: ${row.firstName} ${row.lastName}`);
        totalImported++;
        
      } catch (err: any) {
        // Only log actual errors, not skip notifications
        if (err.message !== 'Missing required field: firstName') {
          console.error(`    ✗ Row ${rowNum}: ${err.message}`);
          errors.push(`Sheet ${sheetName}, Row ${rowNum}: ${err.message}`);
          totalFailed++;
        }
      }
    }
  }
  
  console.log(`\n========================`);
  console.log('Import Summary:');
  console.log(`  ✓ Imported: ${totalImported}`);
  console.log(`  ⏭ Skipped: ${totalSkipped}`);
  console.log(`  ✗ Failed: ${totalFailed}`);
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
