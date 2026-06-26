const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const csvDir = 'd:/AGENTS/bmi-ums/CSV FILES';

// 1. Parse File 3: diploma STUDENTS PERFORMANCE (TRANSCRIPT) - Sheet1 (3).csv
function parseTranscriptCSV() {
  const filePath = path.join(csvDir, 'diploma STUDENTS PERFORMANCE (TRANSCRIPT) - Sheet1 (3).csv');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`\n--- transcript.csv data summary ---`);
  console.log(`Total rows parsed: ${data.length}`);
  
  // Row 0: ,STUDENT DETAILS,,,,,,EXAM GRADES - PER COURSE
  // Row 2: Headers
  const headers = data[2] || [];
  console.log('Headers count:', headers.length);
  
  const studentDetailsHeaders = headers.slice(0, 7);
  const courseHeaders = headers.slice(7);
  
  console.log('Student detail columns:', studentDetailsHeaders);
  console.log('Course columns count:', courseHeaders.length);
  console.log('First 5 courses:', courseHeaders.slice(0, 5));
  
  let validStudentsCount = 0;
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    const studentName = row[0];
    const admissionNo = row[2];
    if (studentName || admissionNo) {
      validStudentsCount++;
    }
  }
  console.log(`Valid students found: ${validStudentsCount}`);
}

// 2. Parse File 1: DIPLOMA MUKURWEINI Class Final GRADES  - Sheet2 (2).csv
function parseMukurweiniCSV() {
  const filePath = path.join(csvDir, 'DIPLOMA MUKURWEINI Class Final GRADES  - Sheet2 (2).csv');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`\n--- Mukurweini CSV summary ---`);
  console.log(`Total rows parsed: ${data.length}`);
  
  // Row 1: ,,,MUKURWEINI CAMPUS,,,,,,,,, GIATHUGU CAMPUS
  // Row 2: Student names
  console.log('Row 1 (Campuses):', data[1]);
  console.log('Row 2 (Student names):', data[2]);
  
  // Find valid columns
  const studentNames = data[2] || [];
  studentNames.forEach((name, idx) => {
    if (name && name.trim()) {
      console.log(`Col ${idx}: ${name.trim()}`);
    }
  });
}

// 3. Parse File 2: KIAMBU DIPLOMA GRADES - Sheet1 (2).csv
function parseKiambuCSV() {
  const filePath = path.join(csvDir, 'KIAMBU DIPLOMA GRADES - Sheet1 (2).csv');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`\n--- Kiambu CSV summary ---`);
  console.log(`Total rows parsed: ${data.length}`);
  console.log('Row 2 (Admission numbers):', data[2]);
  console.log('Row 3 (Student names):', data[3]);
}

parseTranscriptCSV();
parseMukurweiniCSV();
parseKiambuCSV();
