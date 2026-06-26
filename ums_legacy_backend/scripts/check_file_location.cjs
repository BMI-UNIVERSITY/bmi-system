const fs = require('fs');
const path = require('path');

const pathsToCheck = [
  'd:/AGENTS/bmi-ums/UMS_Import_Template_BMI.xlsx',
  'd:/AGENTS/bmi-ums/backend/UMS_Import_Template_BMI.xlsx',
  'd:/AGENTS/bmi-ums/backend/data/UMS_Import_Template_BMI.xlsx',
];

pathsToCheck.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`Found template at: ${p} (Size: ${fs.statSync(p).size} bytes)`);
  } else {
    console.log(`Not found at: ${p}`);
  }
});
