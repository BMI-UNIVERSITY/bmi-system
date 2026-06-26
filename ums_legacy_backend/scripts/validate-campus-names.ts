/**
 * validate-campus-names.ts
 *
 * Regression validation script for campus name consistency.
 * Verifies that the diploma-students-import.json data file contains the
 * correct campus names and student counts after the Katarina → Karatina Campus 2 fix.
 *
 * Usage:
 *   npx ts-node backend/scripts/validate-campus-names.ts
 *
 * Exit codes:
 *   0 - All validations passed
 *   1 - One or more validations failed
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Student {
  firstName: string;
  lastName: string;
  admissionNo: string;
  phoneNo: string;
  country: string;
  program: string;
  note: string;
}

interface CampusGroup {
  campus: string;
  students: Student[];
}

interface CampusSummary {
  [campusName: string]: number;
}

interface ImportData {
  program: string;
  academicYear: string;
  totalStudents: number;
  campuses: CampusGroup[];
  summary: {
    campuses: CampusSummary;
    totalStudents: number;
  };
}

interface ValidationResult {
  passed: boolean;
  message: string;
}

function check(condition: boolean, message: string): ValidationResult {
  return { passed: condition, message };
}

function runValidations(data: ImportData): void {
  const results: ValidationResult[] = [];
  const campusMap = new Map<string, number>(
    data.campuses.map((c) => [c.campus, c.students.length])
  );

  // 1. "Katarina" (the misspelled name) must NOT exist
  results.push(
    check(
      !campusMap.has('Katarina'),
      '"Katarina" (misspelled) campus must NOT exist in the data'
    )
  );

  // 2. "Karatina Campus 2" must exist with exactly 6 students
  results.push(
    check(
      campusMap.get('Karatina Campus 2') === 6,
      `"Karatina Campus 2" must have 6 students (found: ${campusMap.get('Karatina Campus 2') ?? 'missing'})`
    )
  );

  // 3. "Karatina" (main campus) must exist with exactly 27 students
  results.push(
    check(
      campusMap.get('Karatina') === 27,
      `"Karatina" must have 27 students (found: ${campusMap.get('Karatina') ?? 'missing'})`
    )
  );

  // 4. Summary must also reflect correct names
  results.push(
    check(
      !('Katarina' in data.summary.campuses),
      '"Katarina" must NOT appear in summary.campuses'
    )
  );

  results.push(
    check(
      data.summary.campuses['Karatina Campus 2'] === 6,
      `summary.campuses["Karatina Campus 2"] must be 6 (found: ${data.summary.campuses['Karatina Campus 2'] ?? 'missing'})`
    )
  );

  results.push(
    check(
      data.summary.campuses['Karatina'] === 27,
      `summary.campuses["Karatina"] must be 27 (found: ${data.summary.campuses['Karatina'] ?? 'missing'})`
    )
  );

  // 5. Other campuses must be unchanged
  const expectedOtherCampuses: Array<[string, number]> = [
    ['Mukurweini', 15],
    ['Othaya', 7],
    ['Nyeri', 7],
  ];

  for (const [campusName, expectedCount] of expectedOtherCampuses) {
    results.push(
      check(
        campusMap.get(campusName) === expectedCount,
        `"${campusName}" must have ${expectedCount} students (found: ${campusMap.get(campusName) ?? 'missing'})`
      )
    );
  }

  // 6. Hellen George with KEN-DP225-611 must be in Karatina Campus 2
  const kc2Group = data.campuses.find((c) => c.campus === 'Karatina Campus 2');
  const hellenGeorge = kc2Group?.students.find(
    (s) => s.firstName === 'Hellen' && s.lastName === 'George' && s.admissionNo === 'KEN-DP225-611'
  );
  results.push(
    check(
      hellenGeorge !== undefined,
      'Hellen George (KEN-DP225-611) must be present in "Karatina Campus 2"'
    )
  );

  // 7. Total students in JSON header matches summary
  results.push(
    check(
      data.totalStudents === data.summary.totalStudents,
      `JSON totalStudents (${data.totalStudents}) must match summary.totalStudents (${data.summary.totalStudents})`
    )
  );

  // --- Report ---
  console.log('\n=== Campus Name Validation Report ===\n');

  let allPassed = true;
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon}  ${result.message}`);
    if (!result.passed) {
      allPassed = false;
    }
  }

  console.log('\nCampus breakdown:');
  for (const [campus, count] of campusMap.entries()) {
    console.log(`  ${campus}: ${count} students`);
  }
  console.log(`  TOTAL (from arrays): ${data.campuses.reduce((s, c) => s + c.students.length, 0)}`);
  console.log(`  TOTAL (from header): ${data.totalStudents}`);

  console.log('');
  if (allPassed) {
    console.log('✅ All campus name validations PASSED.\n');
    process.exit(0);
  } else {
    console.error('❌ Some campus name validations FAILED. See details above.\n');
    process.exit(1);
  }
}

function main(): void {
  const dataFilePath = path.resolve(
    __dirname,
    '..',
    'data',
    'diploma-students-import.json'
  );

  if (!fs.existsSync(dataFilePath)) {
    console.error(`❌ Data file not found: ${dataFilePath}`);
    process.exit(1);
  }

  let data: ImportData;
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    data = JSON.parse(raw) as ImportData;
  } catch (err) {
    console.error(`❌ Failed to parse JSON: ${(err as Error).message}`);
    process.exit(1);
  }

  runValidations(data);
}

main();
