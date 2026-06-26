import { getGoogleSheetRange } from './src/services/googleAuth.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function debug() {
    const spreadsheetId = '1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg';
    const sheets = ["01_FACULTIES", "02_DEPARTMENTS", "03_PROGRAMS", "04_COURSES", "05_PROG_COURSES", "06_STAFF", "07_STUDENTS", "08_ENROLLMENTS", "09_GRADES"];

    const tabMap: Record<string, string> = {
      "FACULTIES": "faculties",
      "DEPARTMENTS": "departments",
      "PROGRAMS": "programs",
      "COURSES": "courses",
      "PROG_COURSES": "program_courses",
      "STAFF": "staff",
      "STUDENTS": "students",
      "ENROLLMENTS": "enrollments",
      "GRADES": "grades",
    };

    const importPayload: Record<string, any[]> = {};

    for (const tabName of sheets) {
      const upperTab = tabName.toUpperCase();
      let matchedKey: string | null = null;
      for (const [pattern, key] of Object.entries(tabMap)) {
        if (upperTab.includes(pattern)) {
          matchedKey = key;
          break; // BUG: if pattern is COURSES, it matches PROG_COURSES
        }
      }
      console.log(`${tabName} -> matchedKey: ${matchedKey}`);

      try {
        const range = `'${tabName}'!A1:Z5000`;
        const rawGrid = await getGoogleSheetRange(spreadsheetId, range);
        console.log(`  Fetched ${rawGrid?.length || 0} rows from Google API`);
        importPayload[matchedKey!] = rawGrid || [];
      } catch (err: any) {
        console.error(`  Error: ${err.message}`);
      }
    }
}

debug();