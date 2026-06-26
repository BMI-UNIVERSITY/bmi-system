import ExcelJS from 'exceljs';
import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@bmi.edu';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

interface ExamRecord {
  admissionNo: string;
  studentName: string;
  [courseName: string]: string | number | null;
}

// Course field mapping from Excel headers to database field names
const COURSE_FIELD_MAP: Record<string, string> = {
  'HOMILETICS': 'HOMILETICS',
  'HERMENEUTICS': 'HERMENEUTICS',
  'CHURCH ADMIN': 'CHURCH_ADMIN',
  'PNEUMATOLOGY': 'PNEUMATOLOGY',
  'EVANGELISM': 'EVANGELISM',
  'ESCHATOLOGY': 'ESCHATOLOGY',
  'PRINCIPLE OF SUCCESS': 'PRINCIPLE_OF_SUCCESS',
  'ANGELOLOGY': 'ANGELOLOGY',
  'HAMARTIOLOGY': 'HAMARTIOLOGY',
  'NEW SURVEY': 'NEW_SURVEY',
  'OLD SURVEY': 'OLD_SURVEY',
  'CHRISTOLOGY': 'CHRISTOLOGY',
  'CHURCH GROWTH': 'CHURCH_GROWTH',
  'BIBLIOLOGY': 'BIBLIOLOGY',
  'THEOLOGY PROPER': 'THEOLOGY_PROPER',
  'SOTERIOLOGY': 'SOTERIOLOGY',
  'CHRISTIAN FAMILY': 'CHRISTIAN_FAMILY',
  'CHURCH PLANTING': 'CHURCH_PLANTING',
  'CHURCH HISTORY': 'CHURCH_HISTORY',
  'PRAISE AND WORSHIP': 'PRAISE_AND_WORSHIP',
  'SPIRITUAL WARFARE': 'SPIRITUAL_WARFARE',
  'FOUNDATIONSUCCESSFUL MINISTRY': 'FOUNDATION_SUCCESSFUL_MINISTRY',
  'SPIRITUAL FORMATION': 'SPIRITUAL_FORMATION',
  'KINGDOM PRINCIPLES': 'KINGDOM_PRINCIPLES',
  'PRINCIPLES OF SUCCESS': 'PRINCIPLES_OF_SUCCESS',
  'UNDERSTANDING GODS': 'UNDERSTANDING_GODS',
  'ECCLESIOLOGY': 'ECCLESIOLOGY',
  'PASTORAL COUNSELLING&ETHICS': 'PASTORAL_COUNSELLING_ETHICS',
  'GREEK': 'GREEK',
  'CHRISTIAN APOLOGETICS': 'CHRISTIAN_APOLOGETICS',
  'HEBREW': 'HEBREW',
  'WORLD RELIGION': 'WORLD_RELIGION',
  'SPIRITUAL REALM': 'SPIRITUAL_REALM'
};

function getPocketBase(): PocketBase {
  return new PocketBase(PB_URL);
}

async function authenticateAdmin(pb: PocketBase) {
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✓ Authenticated as admin');
  } catch (error: any) {
    console.error('✗ Failed to authenticate:', error.message);
    throw error;
  }
}

async function parseExcelFile(filePath: string): Promise<ExamRecord[]> {
  console.log(`Reading file: ${filePath}`);
  
  // Resolve path relative to backend directory
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '../..', filePath);
  
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(resolvedPath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Excel file must have at least one worksheet');
  }

  // Load all cells from worksheet into rawData array of arrays for easy indexing
  const rawData: any[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const rowValues: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowValues[colNumber - 1] = cell.value;
    });
    rawData[rowNumber - 1] = rowValues;
  });

  if (rawData.length < 2) {
    throw new Error('Excel file must have at least a header row and one data row');
  }

  // Find header rows
  let headerRowIndex = -1;

  for (let i = 0; i < Math.min(5, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.length > 0) {
      const firstCell = String(row[0] || '').trim().toUpperCase();
      const secondCell = String(row[1] || '').trim().toUpperCase();
      
      // Look for "ADMISSION" or "NO" in first column and "STUDENT" or "NAME" in second
      if ((firstCell.includes('ADMISSION') || firstCell.includes('NO')) && 
          (secondCell.includes('STUDENT') || secondCell.includes('NAME'))) {
        headerRowIndex = i;
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Could not find header row with ADMISSION. NO and Student Name columns');
  }

  const headers = rawData[headerRowIndex];
  console.log(`Found headers at row ${headerRowIndex + 1}`);

  // Parse data rows
  const records: ExamRecord[] = [];
  
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const admissionNo = String(row[0] || '').trim();
    const studentName = String(row[1] || '').trim();

    // Skip empty rows
    if (!admissionNo && !studentName) continue;

    const record: ExamRecord = {
      admissionNo,
      studentName
    };

    // Map course grades (starting from column 2)
    for (let col = 2; col < headers.length; col++) {
      const courseHeader = String(headers[col] || '').trim().toUpperCase();
      const dbFieldName = COURSE_FIELD_MAP[courseHeader];

      if (dbFieldName) {
        const value = row[col];
        
        // Parse grade value
        if (value !== null && value !== undefined && value !== '') {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            record[dbFieldName] = numValue;
          }
        }
      }
    }

    records.push(record);
  }

  console.log(`✓ Parsed ${records.length} exam records`);
  return records;
}

async function importExamRecords(pb: PocketBase, records: ExamRecord[]) {
  console.log(`\nImporting ${records.length} records to exams_grades collection...`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const record of records) {
    try {
      await pb.collection('exams_grades').create(record);
      successCount++;
      
      if (successCount % 10 === 0) {
        process.stdout.write(`\rProgress: ${successCount}/${records.length}`);
      }
    } catch (error: any) {
      errorCount++;
      const errorMsg = `Failed to import ${record.admissionNo} - ${record.studentName}: ${error.message}`;
      errors.push(errorMsg);
      
      if (errorCount <= 5) {
        console.error(`\n✗ ${errorMsg}`);
      }
    }
  }

  console.log(`\n\n✓ Import completed!`);
  console.log(`  Successfully imported: ${successCount}`);
  console.log(`  Failed: ${errorCount}`);
  
  if (errorCount > 5) {
    console.log(`  (Showing first 5 errors, ${errorCount - 5} more errors occurred)`);
  }

  return { successCount, errorCount };
}

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: cd backend && npx tsx scripts/import-exams-from-template.ts <path-to-file.xlsx>');
    console.error('\nExpected format:');
    console.error('  Column A: ADMISSION. NO');
    console.error('  Column B: Student Name');
    console.error('  Columns C+: Course grades (HOMILETICS, HERMENEUTICS, etc.)');
    console.error('\nExample:');
    console.error('  npx tsx scripts/import-exams-from-template.ts ../bmi-exams-template.xlsx');
    process.exit(1);
  }

  try {
    console.log('BMI UMS - Exam Data Import');
    console.log('===========================\n');

    // Parse Excel file
    const records = await parseExcelFile(filePath);

    if (records.length === 0) {
      console.error('✗ No valid records found in the file');
      process.exit(1);
    }

    // Connect to PocketBase
    const pb = getPocketBase();
    await authenticateAdmin(pb);

    // Import records
    const { successCount, errorCount } = await importExamRecords(pb, records);

    if (errorCount > 0) {
      console.log('\n⚠ Import completed with errors');
      process.exit(1);
    } else {
      console.log('\n✓ All records imported successfully!');
      process.exit(0);
    }
  } catch (error: any) {
    console.error('\n✗ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
