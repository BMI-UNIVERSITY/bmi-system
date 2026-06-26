import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

/**
 * Extract student data from BMI UNIVERSITY 1 (1).xlsx
 * This file contains student names and their course grades
 */
function extractFromBMIUniversity(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const students = [];
  
  // Student names are in row 2 (index 1), columns C onwards
  // Format: "FIRST\nMIDDLE\nLAST" or "FIRST\nLAST"
  const nameRow = 2; // Row 3 in Excel (0-indexed)
  
  for (let col = 2; col < (data[nameRow]?.length || 0); col++) {
    const cellValue = data[nameRow][col];
    if (cellValue && typeof cellValue === 'string') {
      const nameParts = cellValue.split('\n').map(part => part.trim()).filter(Boolean);
      
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        
        students.push({
          'First Name': firstName,
          'Last Name': lastName,
          'Email': '',
          'Phone': '',
          'Gender': '',
          'Country': 'Kenya',
          'Faculty': 'Theology',
          'Department': 'Theology',
          'Academic Level': 'Diploma',
          'Admission Year': '2023',
          'Admission Number': '',
          'Enrollment Term': 'Fall 2023',
          'Status': 'Active'
        });
      }
    }
  }
  
  return students;
}

/**
 * Extract student data from diploma STUDENTS PERFORMANCE (TRANSCRIPT).xlsx
 * This file contains admission numbers, phone numbers, and student names
 */
function extractFromDiplomaStudents(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const students = [];
  
  // Process different class sections
  const sections = [
    { start: 2, end: 14, className: 'Diploma Class' },
    { start: 17, end: 42, className: 'Karatina Class' },
    { start: 44, end: 50, className: 'Othaya Class' },
    { start: 52, end: 59, className: 'Nyeri Class' },
    { start: 61, end: 66, className: 'Karatina Campus 2 Class 2025' }
  ];

  for (const section of sections) {
    for (let row = section.start; row <= section.end && row < data.length; row++) {
      const rowData = data[row];
      if (!rowData || rowData.length === 0) continue;

      const nameCell = rowData[1]; // Column B - Student name
      const admissionNo = rowData[2]; // Column C - Admission number
      const phoneNo = rowData[3]; // Column D - Phone number

      if (nameCell && typeof nameCell === 'string' && nameCell.trim()) {
        // Parse name - format varies: "First Last", "First Middle Last", etc.
        const nameParts = nameCell.trim().split(/\s+/).filter(Boolean);
        
        if (nameParts.length >= 2) {
          const firstName = nameParts[0];
          const lastName = nameParts[nameParts.length - 1];
          
          students.push({
            'First Name': firstName,
            'Last Name': lastName,
            'Email': '',
            'Phone': phoneNo ? String(phoneNo).trim() : '',
            'Gender': '',
            'Country': 'Kenya',
            'Faculty': 'Theology',
            'Department': 'Theology',
            'Academic Level': 'Diploma',
            'Admission Year': admissionNo ? String(admissionNo).substring(0, 3) === '225' ? '2022' : '2023' : '',
            'Admission Number': admissionNo ? String(admissionNo).trim() : '',
            'Enrollment Term': 'Fall',
            'Status': 'Active'
          });
        }
      }
    }
  }
  
  return students;
}

/**
 * Merge student records, prioritizing data from diploma file (has more details)
 */
function mergeStudentRecords(bmiStudents, diplomaStudents) {
  const merged = new Map();

  // Add diploma students first (they have admission numbers and phone)
  for (const student of diplomaStudents) {
    const key = `${student['First Name']?.toLowerCase()}_${student['Last Name']?.toLowerCase()}`;
    merged.set(key, {
      'First Name': student['First Name'] || '',
      'Last Name': student['Last Name'] || '',
      'Email': student['Email'] || '',
      'Phone': student['Phone'] || '',
      'Gender': student['Gender'] || '',
      'Country': student['Country'] || 'Kenya',
      'Faculty': student['Faculty'] || 'Theology',
      'Department': student['Department'] || 'Theology',
      'Academic Level': student['Academic Level'] || 'Diploma',
      'Admission Year': student['Admission Year'] || '',
      'Admission Number': student['Admission Number'] || '',
      'Enrollment Term': student['Enrollment Term'] || '',
      'Status': student['Status'] || 'Active'
    });
  }

  // Add BMI students if not already present
  for (const student of bmiStudents) {
    const key = `${student['First Name']?.toLowerCase()}_${student['Last Name']?.toLowerCase()}`;
    if (!merged.has(key)) {
      merged.set(key, {
        'First Name': student['First Name'] || '',
        'Last Name': student['Last Name'] || '',
        'Email': student['Email'] || '',
        'Phone': student['Phone'] || '',
        'Gender': student['Gender'] || '',
        'Country': student['Country'] || 'Kenya',
        'Faculty': student['Faculty'] || 'Theology',
        'Department': student['Department'] || 'Theology',
        'Academic Level': student['Academic Level'] || 'Diploma',
        'Admission Year': student['Admission Year'] || '',
        'Admission Number': student['Admission Number'] || '',
        'Enrollment Term': student['Enrollment Term'] || '',
        'Status': student['Status'] || 'Active'
      });
    }
  }

  return Array.from(merged.values());
}

/**
 * Export merged data to template format
 */
function exportToTemplate(students, outputPath) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(students);
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  XLSX.writeFile(workbook, outputPath);
  
  console.log(`✓ Exported ${students.length} students to ${outputPath}`);
}

/**
 * Main execution
 */
function main() {
  try {
    const bmiFile = 'BMI UNIVERSITY 1 (1).xlsx';
    const diplomaFile = 'diploma STUDENTS PERFORMANCE (TRANSCRIPT).xlsx';
    const outputFile = 'bmi_students_exported.xlsx';

    console.log('Starting student data extraction...\n');

    // Check if files exist
    if (!fs.existsSync(bmiFile)) {
      console.error(`Error: ${bmiFile} not found`);
      process.exit(1);
    }
    if (!fs.existsSync(diplomaFile)) {
      console.error(`Error: ${diplomaFile} not found`);
      process.exit(1);
    }

    console.log(`Reading ${bmiFile}...`);
    const bmiStudents = extractFromBMIUniversity(bmiFile);
    console.log(`  Found ${bmiStudents.length} students`);

    console.log(`\nReading ${diplomaFile}...`);
    const diplomaStudents = extractFromDiplomaStudents(diplomaFile);
    console.log(`  Found ${diplomaStudents.length} students`);

    console.log('\nMerging student records...');
    const mergedStudents = mergeStudentRecords(bmiStudents, diplomaStudents);
    console.log(`  Total unique students: ${mergedStudents.length}`);

    console.log(`\nExporting to ${outputFile}...`);
    exportToTemplate(mergedStudents, outputFile);

    console.log('\n✓ Export completed successfully!');
    console.log(`\nOutput file: ${outputFile}`);
    console.log(`Total students exported: ${mergedStudents.length}`);
  } catch (error) {
    console.error('Error during export:', error);
    process.exit(1);
  }
}

main();






