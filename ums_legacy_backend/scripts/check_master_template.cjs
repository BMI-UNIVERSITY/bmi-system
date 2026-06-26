const XLSX = require('xlsx');
const path = require('path');

const filePath = 'd:/AGENTS/bmi-ums/public/UMS_Import_Template_BMI_V2.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Sheet Names:', workbook.SheetNames);
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\nSheet: ${sheetName}`);
    data.slice(0, 5).forEach((row, idx) => {
      console.log(`  Row ${idx}:`, row);
    });
  });
} catch (e) {
  console.error('Error reading master template:', e.message);
}
