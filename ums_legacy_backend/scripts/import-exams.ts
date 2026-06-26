/**
 * BMI UMS - Import Exam Results from Excel/CSV
 * Creates dynamic collection for exam results
 * Usage: npx tsx scripts/import-exams.ts <path-to-file.xlsx> [collection-name]
 */

import { getPocketBase } from '../src/services/pocketbase.js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

interface ExamRow {
  studentId: string;
  studentName: string;
  course: string;
  courseCode?: string;
  midterm?: number;
  final?: number;
  [key: string]: string | number | undefined;
}

// Column mapping
const COLUMN_MAP: Record<string, string> = {
  'student id': 'studentId',
  'studentid': 'studentId',
  'student_id': 'studentId',
  'id': 'studentId',
  'reg no': 'studentId',
  'registration': 'studentId',
  'admission number': 'studentId',
  'student name': 'studentName',
  'studentname': 'studentName',
  'name': 'studentName',
  'full name': 'studentName',
  'course': 'course',
  'subject': 'course',
  'module': 'course',
  'unit': 'course',
  'course code': 'courseCode',
  'code': 'courseCode',
  'subject code': 'courseCode',
  'midterm': 'midterm',
  'mid term': 'midterm',
  'mid_term': 'midterm',
  'cat': 'midterm',
  'continuous assessment': 'midterm',
  'ca': 'midterm',
  'final': 'final',
  'final exam': 'final',
  'final_exam': 'final',
  'end of term': 'final',
  'end_of_term': 'final',
  'exam': 'final',
  'finals': 'final',
};

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[_\-]+/g, ' ');
}

function mapRow(rawRow: Record<string, any>): { row: ExamRow; dynamicFields: string[] } {
  const row: Partial<ExamRow> = {};
  const dynamicFields: string[] = [];
  
  for (const [rawKey, value] of Object.entries(rawRow)) {
    if (value === undefined || value === null || value === '') continue;
    
    const normKey = normalizeKey(rawKey);
    const mappedKey = COLUMN_MAP[normKey];
    
    if (mappedKey) {
      if (mappedKey === 'midterm' || mappedKey === 'final') {
        row[mappedKey] = parseFloat(String(value)) || 0;
      } else {
        row[mappedKey] = String(value).trim();
      }
    } else {
      // Dynamic field (assignment, project, quiz, etc.)
      const numVal = parseFloat(String(value));
      row[rawKey] = isNaN(numVal) ? String(value).trim() : numVal;
      if (!dynamicFields.includes(rawKey)) {
        dynamicFields.push(rawKey);
      }
    }
  }
  
  if (!row.studentId && !row.studentName) {
    throw new Error('Missing student ID or name');
  }
  if (!row.course) {
    throw new Error('Missing course name');
  }
  
  return { row: row as ExamRow, dynamicFields };
}

async function createExamCollection(pb: any, name: string, dynamicFields: string[]) {
  console.log(`Creating exam collection: ${name}`);
  
  const schema = [
    { name: 'studentId', type: 'text', required: true },
    { name: 'studentName', type: 'text', required: true },
    { name: 'course', type: 'text', required: true },
    { name: 'courseCode', type: 'text', required: false },
    { name: 'midterm', type: 'number', required: false },
    { name: 'final', type: 'number', required: false },
    ...dynamicFields.map(field => ({
      name: field.replace(/[^a-zA-Z0-9_]/g, '_'),
      type: 'number',
      required: false,
    })),
  ];
  
  try {
    // Check if collection exists
    const existing = await pb.collections.getOne(name);
    console.log(`  Collection ${name} already exists`);
    return existing;
  } catch {
    // Create new collection
    const collection = await pb.collections.create({
      name,
      type: 'base',
      schema,
    });
    console.log(`  ✓ Created collection with ${schema.length} fields`);
    return collection;
  }
}

async function importExams(filePath: string, collectionName?: string) {
  const pb = getPocketBase();
  
  console.log(`Reading file: ${filePath}\n`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  const data = fs.readFileSync(filePath);
  const workbook = XLSX.read(data, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
  
  console.log(`Found ${rawRows.length} rows to import\n`);
  
  if (rawRows.length === 0) {
    console.error('No data found in file');
    process.exit(1);
  }
  
  // First pass: map all rows and collect dynamic fields
  const mappedRows: ExamRow[] = [];
  let allDynamicFields: string[] = [];
  
  for (const rawRow of rawRows) {
    try {
      const { row, dynamicFields } = mapRow(rawRow);
      mappedRows.push(row);
      allDynamicFields = [...new Set([...allDynamicFields, ...dynamicFields])];
    } catch (err: any) {
      console.error(`  ✗ Skipped row: ${err.message}`);
    }
  }
  
  console.log(`Valid rows: ${mappedRows.length}`);
  console.log(`Dynamic fields found: ${allDynamicFields.join(', ') || 'None'}`);
  
  // Generate collection name if not provided
  const finalCollectionName = collectionName || `exams_${new Date().getFullYear()}_${Date.now().toString().slice(-4)}`;
  
  // Create collection
  await createExamCollection(pb, finalCollectionName, allDynamicFields);
  
  // Import records
  console.log(`\nImporting to ${finalCollectionName}...\n`);
  
  let imported = 0;
  let failed = 0;
  
  for (let i = 0; i < mappedRows.length; i++) {
    const row = mappedRows[i];
    const rowNum = i + 2;
    
    try {
      // Sanitize dynamic field names
      const recordData: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
        recordData[safeKey] = value;
      }
      
      await pb.collection(finalCollectionName).create(recordData);
      console.log(`  ✓ Row ${rowNum}: ${row.studentName || row.studentId} - ${row.course}`);
      imported++;
    } catch (err: any) {
      console.error(`  ✗ Row ${rowNum}: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n========================`);
  console.log('Import Summary:');
  console.log(`  Collection: ${finalCollectionName}`);
  console.log(`  ✓ Imported: ${imported}`);
  console.log(`  ✗ Failed: ${failed}`);
  console.log(`  Dynamic fields: ${allDynamicFields.length > 0 ? allDynamicFields.join(', ') : 'None'}`);
}

// Main
const filePath = process.argv[2];
const collectionName = process.argv[3];

if (!filePath) {
  console.error('Usage: npx tsx scripts/import-exams.ts <path-to-file.xlsx> [collection-name]');
  console.error('\nExpected columns:');
  console.error('  Required: Student ID (or Student Name), Course');
  console.error('  Optional: Course Code, Midterm, Final');
  console.error('  Dynamic: Any additional columns (Assignment 1, Project, Quiz, etc.)');
  console.error('\nExample:');
  console.error('  npx tsx scripts/import-exams.ts ./my-exams.xlsx exams_2024_fall');
  process.exit(1);
}

importExams(filePath, collectionName).catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
