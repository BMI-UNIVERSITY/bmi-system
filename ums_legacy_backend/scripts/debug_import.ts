import { importRelationalData } from './src/services/importService.js';
import { getGoogleSheetRange } from './src/services/googleAuth.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function parseSheetRows(rows: string[][]): any[] {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map(h => String(h || "").trim());
  const parsed: any[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(cell => !cell || String(cell).trim() === "")) continue;
    const obj: any = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) obj[headers[j]] = row[j] !== undefined ? String(row[j]).trim() : "";
    }
    parsed.push(obj);
  }
  return parsed;
}

import { authenticateAdmin } from './src/services/pocketbase.js';

async function debug() {
    await authenticateAdmin();
    const spreadsheetId = '1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg';
    
    // Just fetch Staff and Grades to see what happens
    const staffRows = await getGoogleSheetRange(spreadsheetId, "'06_STAFF'!A1:Z5000");
    const enrollmentsRows = await getGoogleSheetRange(spreadsheetId, "'08_ENROLLMENTS'!A1:Z5000");
    const gradesRows = await getGoogleSheetRange(spreadsheetId, "'09_GRADES'!A1:Z5000");

    const payload = {
        staff: parseSheetRows(staffRows || []),
        enrollments: parseSheetRows(enrollmentsRows || []).slice(0, 10), // just test 10
        grades: parseSheetRows(gradesRows || []).slice(0, 10),
    };

    console.log('Payload samples:');
    console.log('Staff[0]:', payload.staff[0]);
    console.log('Enrollments[0]:', payload.enrollments[0]);
    console.log('Grades[0]:', payload.grades[0]);

    const results = await importRelationalData(payload);
    console.log('Results:', results);
}

debug();