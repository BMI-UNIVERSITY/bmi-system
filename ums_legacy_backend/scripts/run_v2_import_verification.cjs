const XLSX = require('xlsx');
const http = require('http');

const adminEmail = 'admin@bmi.edu';
const adminPassword = 'BMIAdmin2024Secure';
const templatePath = 'd:/AGENTS/bmi-ums/public/UMS_Import_Template_BMI_V2.xlsx';

function post(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const postData = JSON.stringify(body);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    };
    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(responseBody)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseBody
          });
        }
      });
    });
    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('1. Logging in as admin...');
  const loginRes = await post('http://127.0.0.1:3001/api/v1/auth/login', {}, {
    email: adminEmail,
    password: adminPassword
  });
  
  if (loginRes.statusCode !== 200) {
    console.error('Login failed:', loginRes.statusCode, loginRes.body);
    process.exit(1);
  }
  
  const token = loginRes.body.data.token;
  console.log('Login successful! Token acquired.');
  
  console.log('\n2. Parsing generated Excel file...');
  const workbook = XLSX.readFile(templatePath);
  const getSheetData = (sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  };
  
  const payload = {
    faculties: getSheetData('01_FACULTIES'),
    departments: getSheetData('02_DEPARTMENTS'),
    programs: getSheetData('03_PROGRAMS'),
    courses: getSheetData('04_COURSES'),
    program_courses: getSheetData('05_PROG_COURSES'),
    staff: getSheetData('06_STAFF'),
    students: getSheetData('07_STUDENTS'),
    enrollments: getSheetData('08_ENROLLMENTS'),
    grades: getSheetData('09_GRADES'),
  };
  
  console.log('Payload summary:');
  Object.keys(payload).forEach(key => {
    console.log(`- ${key}: ${payload[key].length} rows`);
  });
  
  console.log('\n3. Sending payload to /api/v1/import/v2...');
  const importRes = await post('http://127.0.0.1:3001/api/v1/import/v2', {
    'Authorization': `Bearer ${token}`
  }, payload);
  
  console.log('Status Code:', importRes.statusCode);
  console.log('Response Body:', JSON.stringify(importRes.body, null, 2));
}

run().catch(console.error);
