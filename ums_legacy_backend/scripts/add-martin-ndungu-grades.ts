import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');

// Course name to code mapping based on DATABASE/3_courses.csv
const courseMapping: Record<string, string> = {
  'HERMENEUTICS': 'HER 114',
  'HOMILETICS': 'HOM 121',
  'PNEUMATOLOGY': 'PNE 126',
  'PRINCIPLES OF SUCCESS': 'POS 217',
  'CHURCH ADMINSTRATION': 'CAD 212',
  'EVANGELISM': 'EVA 115',
  'ESCHATOLOGY': 'ESC 221',
  'CHRISTOLOGY': 'CHR 124',
  'ANGELOLOGY & DEMONOLOGY': 'ANG 222',
  'BIBLIOLOGY': 'BIB 113',
  'ANTHROPOLOGY & HARMATIOLOGY': 'ANH 223',
  'O.T. SURVEY': 'OTS 111',
  'N.T. SURVEY': 'NTS 112',
  'HEBREW LANGUAGE': 'HEB 312',
  'GREEK LANGUAGE': 'GRK 311',
  'PRAISE & WORSHIP': 'PRW 127',
  'SPIRITUAL FORMATION': 'SPF 216',
  'CHURCH PLANTING': 'CHP 214',
  'BASIC ENGLISH GRAMMAR': 'ENG 101',
  'ACADEMIC WRITING': 'AWR 102',
  'ECCLESIOLOGY': 'ECC 211',
  'KINGDOM PRINCIPLES': 'UKP 218',
  'APOLOGETICS': 'APO 226'
};

// Grading scale
function calculateGrade(score: number): { grade: string; gradePoint: number; remarks: string } {
  if (score >= 90) return { grade: 'A', gradePoint: 4, remarks: 'Pass' };
  if (score >= 80) return { grade: 'A', gradePoint: 4, remarks: 'Pass' };
  if (score >= 75) return { grade: 'B+', gradePoint: 3.5, remarks: 'Pass' };
  if (score >= 70) return { grade: 'B', gradePoint: 3, remarks: 'Pass' };
  if (score >= 65) return { grade: 'C+', gradePoint: 2.5, remarks: 'Pass' };
  if (score >= 60) return { grade: 'C', gradePoint: 2, remarks: 'Pass' };
  if (score >= 55) return { grade: 'D', gradePoint: 1, remarks: 'Pass' };
  return { grade: 'F', gradePoint: 0, remarks: 'Fail' };
}

async function main() {
  try {
    // Check if PocketBase is running
    try {
      await pb.health.check();
    } catch (error) {
      console.error('✗ PocketBase server is not running at', pb.baseUrl);
      console.log('\nPlease start PocketBase first:');
      console.log('  npm run dev:pocketbase');
      console.log('  or');
      console.log('  ./pocketbase serve');
      process.exit(1);
    }

    // Authenticate as admin
    try {
      // Try admin authentication first
      try {
        await pb.admins.authWithPassword(
          process.env.POCKETBASE_ADMIN_EMAIL || 'admin@bmi.edu',
          process.env.POCKETBASE_ADMIN_PASSWORD || 'BMIAdmin2024Secure'
        );
        console.log('✓ Authenticated as admin');
      } catch (adminError) {
        // If admin auth fails, try regular user auth
        await pb.collection('users').authWithPassword(
          process.env.POCKETBASE_ADMIN_EMAIL || 'admin@bmi.edu',
          process.env.POCKETBASE_ADMIN_PASSWORD || 'BMIAdmin2024Secure'
        );
        console.log('✓ Authenticated as user');
      }
    } catch (error: any) {
      console.error('✗ Authentication failed:', error.message);
      console.log('\nPlease check your credentials in .env file');
      console.log('Email:', process.env.POCKETBASE_ADMIN_EMAIL || 'admin@bmi.edu');
      process.exit(1);
    }

    // Read the CSV file
    const csvPath = path.join(__dirname, '../../DIPLOMA MUKURWEINI Class Final GRADES  - Sheet2 (6).csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`✓ Parsed ${records.length} rows from CSV`);

    // Find Martin Njoroge Ndung'u's column (column index 3, 0-based)
    const martinColumnIndex = 3;
    const studentCode = '2025-008';
    const admissionNo = 'KEN-DP 225-538';

    console.log(`\nProcessing grades for Martin Njoroge Ndung'u (${admissionNo}, student code: ${studentCode})`);

    // Get existing grades for this student
    let existingGrades: any[] = [];
    let existingCourses = new Set<string>();
    
    try {
      existingGrades = await pb.collection('academic_records').getFullList({
        filter: `student_code="${studentCode}"`
      });
      existingCourses = new Set(existingGrades.map((g: any) => g.course_code));
      console.log(`✓ Found ${existingGrades.length} existing grade records`);
    } catch (error: any) {
      console.log(`⚠ Could not fetch existing grades (${error.message}). Will attempt to add all grades.`);
    }

    let addedCount = 0;
    let skippedCount = 0;

    // Process each row (skip header row)
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      
      // Skip the study centre row
      if (row[1] === 'study centre') continue;
      
      const courseName = row[1]?.trim().toUpperCase();
      const scoreStr = row[martinColumnIndex]?.toString().trim();

      if (!courseName || !scoreStr) continue;

      // Parse score (handle various formats)
      const cleanScore = scoreStr.replace(/[^0-9.]/g, '');
      const score = parseFloat(cleanScore);

      if (isNaN(score)) {
        console.log(`  ⚠ Skipping ${courseName}: invalid score "${scoreStr}"`);
        continue;
      }

      // Map course name to course code
      const courseCode = courseMapping[courseName];
      
      if (!courseCode) {
        console.log(`  ⚠ Skipping ${courseName}: no course code mapping found`);
        continue;
      }

      // Check if grade already exists
      if (existingCourses.has(courseCode)) {
        console.log(`  - ${courseName} (${courseCode}): ${score} - Already exists, skipping`);
        skippedCount++;
        continue;
      }

      // Calculate grade
      const gradeInfo = calculateGrade(score);

      // Create academic record
      const record = {
        student_code: studentCode,
        course_code: courseCode,
        total_score: score,
        ca_score: null,
        exam_score: null,
        grade: gradeInfo.grade,
        grade_point: gradeInfo.gradePoint,
        remarks: gradeInfo.remarks,
        academic_year: '2025'
      };

      try {
        await pb.collection('academic_records').create(record);
        console.log(`  ✓ Added ${courseName} (${courseCode}): ${score} → ${gradeInfo.grade}`);
        addedCount++;
      } catch (error: any) {
        console.error(`  ✗ Failed to add ${courseName}: ${error.message}`);
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Added: ${addedCount} new grade records`);
    console.log(`Skipped: ${skippedCount} existing records`);
    console.log(`Total grades for Martin: ${existingGrades.length + addedCount}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
