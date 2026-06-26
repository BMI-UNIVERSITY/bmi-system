const XLSX = require('xlsx');
const path = require('path');

const filePath = 'd:/AGENTS/bmi-ums/CSV FILES/KIAMBU DIPLOMA GRADES - Sheet1 (2).csv';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Successfully read CSV using XLSX!');
  console.log('Total Rows:', data.length);
  
  // Print first 10 rows
  console.log('\nFirst 10 Rows:');
  data.slice(0, 10).forEach((row, idx) => {
    console.log(`Row ${idx}:`, row);
  });
} catch (e) {
  console.error('Error:', e.message);
}
