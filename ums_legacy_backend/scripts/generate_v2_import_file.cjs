const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const csvDir = 'd:/AGENTS/bmi-ums/CSV FILES';
const templatePath = 'd:/AGENTS/bmi-ums/public/UMS_Import_Template_BMI_V2.xlsx';
const outputRootPath = 'd:/AGENTS/bmi-ums/UMS_Import_Template_BMI.xlsx';

// Course mapping helper (CSV course name -> DB code)
const courseMapping = {
  'BIBLICAL HERMENEUTICS': 'HER 114',
  'BIBLICAL HERMENEUTICS ': 'HER 114',
  'HERMENEUTICS': 'HER 114',
  'HOMILETICS': 'HOM 121',
  'HOMILETICS ': 'HOM 121',
  'PNEUMATOLOGY': 'PNE 126',
  'PNEUMATOLOGY ': 'PNE 126',
  'PRINCIPLE OF SUCCESS': 'POS 217',
  'PRINCIPLE OF SUCCESS ': 'POS 217',
  'PRINCIPLES OF SUCCESS': 'POS 217',
  'CHURCH ADMIN': 'CAD 212',
  'CHURCH ADMINSTRATION': 'CAD 212',
  'EVANGELISM': 'EVA 115',
  'EVANGELISM ': 'EVA 115',
  'ESCHATOLOGY': 'ESC 221',
  'ESCHATOLOGY ': 'ESC 221',
  'CHRISTOLOGY': 'CHR 124',
  'CHRISTOLOGY ': 'CHR 124',
  'ANGELOLOGY': 'ANG 222',
  'ANGELOLOGY ': 'ANG 222',
  'ANGELOLOGY & DEMONOLOGY': 'ANG 222',
  'BIBLIOLOGY': 'BIB 113',
  'BIBLIOLOGY ': 'BIB 113',
  'HAMARTIOLOGY': 'ANH 223',
  'ANTHROPOLOGY & HARMATIOLOGY': 'ANH 223',
  'OLD TESTAMENT SURVEY': 'OTS 111',
  'OLD TESTAMENT SURVEY ': 'OTS 111',
  'O.T. SURVEY': 'OTS 111',
  'N.T. SURVEY': 'NTS 112',
  'NEW TESTAMENT SURVEY': 'NTS 112',
  'NEW TESTAMENT SURVEY ': 'NTS 112',
  'HEBREW LANGUAGE': 'HEB 312',
  'BIBLICAL HEBREW': 'HEB 312',
  'GREEK LANGUAGE': 'GRK 311',
  'BIBLICAL GREEK': 'GRK 311',
  'ECCLESIOLOGY': 'ECC 211',
  'KINGDOM PRINCIPLES': 'UKP 218',
  'UNDERSTANDING GOD\'S KINGDOM PRINCIPLES': 'UKP 218',
  'UNDERSTANDING GODS': 'UKP 218',
  'APOLOGETICS': 'APO 226',
  'CHRISTIAN APOLOGETICS': 'APO 226',
  'PRAISE & WORSHIP': 'PRW 127',
  'PRAISE AND WORSHIP': 'PRW 127',
  'PRAISE AND WORSHIP ': 'PRW 127',
  'SPIRITUAL FORMATION': 'SPF 216',
  'SPIRITUAL FORMATION ': 'SPF 216',
  'CHURCH PLANTING': 'CHP 214',
  'CHURCH PLANTING ': 'CHP 214',
  'BASIC ENGLISH GRAMMAR': 'ENG 101',
  'ACADEMIC WRITING': 'AWR 102',
  'SOTERIOLOGY': 'SOT 125',
  'SOTERIOLOGY ': 'SOT 125',
  'CHURCH HISTORY': 'CHH 122',
  'CHURCH HISTORY ': 'CHH 122',
  'THEOLOGY PROPER': 'THP 123',
  'THEOLOGY PROPER ': 'THP 123',
  'FOUNDATION OF SUCCESSFUL MINISTRY': 'FSM 215',
  'FOUNDATION OF SUCCESSFUL MINISTRY ': 'FSM 215',
  'SPIRITUAL WARFARE': 'SPW 224',
  'SPIRITUAL WARFARE ': 'SPW 224',
  'SPIRITUAL REALM': 'SPR 225',
  'WORLD RELIGION': 'MWR 228',
  'CHURCH GROWTH': 'CHG 213',
  'CHURCH GROWTH ': 'CHG 213',
  'PASTORAL COUNSELLING&ETHICS': 'PCE 227'
};

// Clean name helper
function cleanName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesFuzzy(name1, name2) {
  const cn1 = cleanName(name1);
  const cn2 = cleanName(name2);
  if (!cn1 || !cn2) return false;
  if (cn1 === cn2) return true;
  
  const tokens1 = cn1.split(' ');
  const tokens2 = cn2.split(' ');
  
  if (tokens1[0] === tokens2[0] && tokens1[tokens1.length - 1] === tokens2[tokens2.length - 1]) {
    return true;
  }
  
  const common = tokens1.filter(t => tokens2.includes(t) && t.length > 2);
  if (common.length >= 2) {
    return true;
  }
  
  return false;
}

function cleanPercentage(val) {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (str === '' || str === '-' || str === 'ABS') return null;
  const cleanStr = str.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? null : parsed;
}

async function run() {
  const studentsMap = new Map(); // student_number -> studentObj
  const gradesList = []; // Array of { student_number, course_code, percentage }

  // ----------------------------------------------------
  // A. PARSE MASTER STUDENTS CSV
  // ----------------------------------------------------
  console.log('1. Parsing Master Students CSV...');
  const msPath = path.join(csvDir, 'BMI MASTER RECORDS - 07_STUDENTS.csv');
  const msWorkbook = XLSX.readFile(msPath);
  const msSheet = msWorkbook.Sheets[msWorkbook.SheetNames[0]];
  const msData = XLSX.utils.sheet_to_json(msSheet, { header: 1 });
  
  // Row 0 has headers: student_number, first_name, last_name, email, phone, gender, program_code, admission_date, status, campus
  for (let i = 1; i < msData.length; i++) {
    const row = msData[i];
    if (!row || row.length === 0) continue;
    
    const student_number = String(row[0] || '').trim().toUpperCase();
    const first_name = String(row[1] || '').trim();
    const last_name = String(row[2] || '').trim();
    const email = String(row[3] || '').trim();
    const phone = String(row[4] || '').replace(/'/g, '').trim(); // Remove leading apostrophes if any
    const gender = String(row[5] || '').trim();
    const program_code = String(row[6] || '').trim() || 'DCMT-200';
    const admission_date = '2025-01-15'; // Standard admission date
    const status = String(row[8] || '').trim() || 'Active';
    const campus = String(row[9] || '').trim();
    
    if (!student_number) continue;
    
    studentsMap.set(student_number, {
      student_number,
      first_name,
      last_name,
      email: email || `${student_number.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.bmi.edu`,
      phone: phone || '',
      gender: gender || 'Male',
      program_code,
      admission_date,
      status,
      campus,
      rawName: `${first_name} ${last_name}`
    });
  }
  
  console.log(`Loaded ${studentsMap.size} students from Master Records.`);

  // ----------------------------------------------------
  // B. PARSE TRANSCRIPT CSV FOR GRADES (Karatina, Nyeri, Othaya)
  // ----------------------------------------------------
  console.log('2. Parsing Transcript CSV grades...');
  const trPath = path.join(csvDir, 'diploma STUDENTS PERFORMANCE (TRANSCRIPT) - Sheet1 (4).csv');
  const trWorkbook = XLSX.readFile(trPath);
  const trSheet = trWorkbook.Sheets[trWorkbook.SheetNames[0]];
  const trData = XLSX.utils.sheet_to_json(trSheet, { header: 1 });
  
  const trHeaders = trData[2] || [];
  const trCourses = trHeaders.slice(7).map(h => String(h || '').trim());
  
  // Data starts at Row 22 (first 21 rows are headers or blank)
  for (let i = 22; i < trData.length; i++) {
    const row = trData[i];
    if (!row || row.length === 0) continue;
    
    const studentName = String(row[0] || '').trim();
    const adm = String(row[2] || '').trim().toUpperCase();
    if (!studentName && !adm) continue;
    
    // Find student in studentsMap by admission no or name
    let student = studentsMap.get(adm);
    if (!student) {
      for (const std of studentsMap.values()) {
        if (matchesFuzzy(std.rawName, studentName)) {
          student = std;
          break;
        }
      }
    }
    
    if (student) {
      trCourses.forEach((cName, colOffset) => {
        const dbCode = courseMapping[cName.toUpperCase().trim()];
        const val = row[colOffset + 7];
        const pct = cleanPercentage(val);
        if (dbCode && pct !== null) {
          gradesList.push({
            student_number: student.student_number,
            course_code: dbCode,
            percentage: pct
          });
        }
      });
    } else {
      console.log(`⚠️ Transcript student not matched in master list: "${studentName}" (Adm: ${adm})`);
    }
  }

  // ----------------------------------------------------
  // C. PARSE MUKURWEINI CAMPUS GRADES CSV
  // ----------------------------------------------------
  console.log('3. Parsing Mukurweini Campus Grades CSV...');
  const mukPath = path.join(csvDir, 'DIPLOMA MUKURWEINI Class Final GRADES  - Sheet2 (2).csv');
  const mukWorkbook = XLSX.readFile(mukPath);
  const mukSheet = mukWorkbook.Sheets[mukWorkbook.SheetNames[0]];
  const mukData = XLSX.utils.sheet_to_json(mukSheet, { header: 1 });
  
  const mukNames = (mukData[2] || []).slice(3).map(n => String(n || '').trim()).filter(n => n.length > 0);
  
  const nameOverrides = {
    'DAVID MUBEA': 'KEN-DP 225-540',
    'MUBEA': 'KEN-DP 225-540'
  };

  const mukStudentNumberMap = new Map();
  mukNames.forEach((n, idx) => {
    const colIdx = idx + 3;
    const cleanN = n.replace(/\s+/g, ' ').trim().toUpperCase();
    
    let student = null;
    // Check overrides first
    const overrideNo = nameOverrides[cleanN];
    if (overrideNo) {
      student = studentsMap.get(overrideNo);
    }
    
    if (!student) {
      for (const std of studentsMap.values()) {
        if (matchesFuzzy(std.rawName, n)) {
          student = std;
          break;
        }
      }
    }
    
    if (student) {
      mukStudentNumberMap.set(colIdx, student.student_number);
    } else {
      console.log(`⚠️ Mukurweini student not matched in master list: "${n}"`);
    }
  });
  
  // Extract grades
  for (let r = 3; r < mukData.length; r++) {
    const row = mukData[r];
    if (!row || row.length === 0) continue;
    const cName = String(row[1] || '').trim().toUpperCase();
    const dbCode = courseMapping[cName];
    if (!dbCode) continue;
    
    mukNames.forEach((_, idx) => {
      const colIdx = idx + 3;
      const val = row[colIdx];
      const pct = cleanPercentage(val);
      const student_number = mukStudentNumberMap.get(colIdx);
      
      if (student_number && pct !== null) {
        // Upsert grade
        const existingIdx = gradesList.findIndex(g => g.student_number === student_number && g.course_code === dbCode);
        if (existingIdx >= 0) {
          gradesList[existingIdx].percentage = pct;
        } else {
          gradesList.push({
            student_number,
            course_code: dbCode,
            percentage: pct
          });
        }
      }
    });
  }

  // ----------------------------------------------------
  // D. PARSE KIAMBU CAMPUS GRADES CSV
  // ----------------------------------------------------
  console.log('4. Parsing Kiambu Campus Grades CSV...');
  const kbPath = path.join(csvDir, 'KIAMBU DIPLOMA GRADES - Sheet1 (2).csv');
  const kbWorkbook = XLSX.readFile(kbPath);
  const kbSheet = kbWorkbook.Sheets[kbWorkbook.SheetNames[0]];
  const kbData = XLSX.utils.sheet_to_json(kbSheet, { header: 1 });
  
  const kbAdms = (kbData[2] || []).slice(2).map(a => String(a || '').trim().toUpperCase()).filter(a => a.length > 0 && a !== 'ADMISSION NO');
  const kbNames = (kbData[3] || []).slice(2).map(n => String(n || '').trim()).filter(n => n.length > 0 && n !== 'STUDENT NAME');
  
  const kbStudentNumberMap = new Map();
  kbNames.forEach((n, idx) => {
    const colIdx = idx + 2;
    const adm = kbAdms[idx];
    
    let student = studentsMap.get(adm);
    if (!student) {
      for (const std of studentsMap.values()) {
        if (matchesFuzzy(std.rawName, n)) {
          student = std;
          break;
        }
      }
    }
    
    if (student) {
      kbStudentNumberMap.set(colIdx, student.student_number);
    } else {
      console.log(`⚠️ Kiambu student not matched in master list: "${n}" (Adm: ${adm})`);
    }
  });
  
  // Extract grades
  for (let r = 4; r < kbData.length; r++) {
    const row = kbData[r];
    if (!row || row.length === 0) continue;
    const cName = String(row[1] || '').trim().toUpperCase();
    const dbCode = courseMapping[cName];
    if (!dbCode) continue;
    
    kbNames.forEach((_, idx) => {
      const colIdx = idx + 2;
      const val = row[colIdx];
      const pct = cleanPercentage(val);
      const student_number = kbStudentNumberMap.get(colIdx);
      
      if (student_number && pct !== null) {
        const existingIdx = gradesList.findIndex(g => g.student_number === student_number && g.course_code === dbCode);
        if (existingIdx >= 0) {
          gradesList[existingIdx].percentage = pct;
        } else {
          gradesList.push({
            student_number,
            course_code: dbCode,
            percentage: pct
          });
        }
      }
    });
  }

  console.log(`\nProcessing stats:`);
  console.log(`- Unified students count: ${studentsMap.size}`);
  console.log(`- Total grades count: ${gradesList.length}`);

  // ----------------------------------------------------
  // E. PREPARE EXCEL SHEETS DATA
  // ----------------------------------------------------
  console.log('\n5. Preparing Excel Sheets Data...');
  
  // 1. Faculties
  const faculties = [
    { faculty_code: 'THEO', name: 'Faculty of Theology' }
  ];
  
  // 2. Departments
  const departments = [
    { dept_code: 'THEO-DEPT', name: 'Department of Theology', faculty_code: 'THEO' }
  ];
  
  // 3. Programs
  const programs = [
    { program_code: 'DCMT-200', name: 'Diploma in Christian Ministry and Theology', degree_level: 'DIPLOMA', dept_code: 'THEO-DEPT', total_credits: 90 }
  ];
  
  // 4. Courses
  const coursesList = [
    { code: 'ENG 101', title: 'Basic English Grammar', credits: 2 },
    { code: 'AWR 102', title: 'Academic Writing', credits: 2 },
    { code: 'OTS 111', title: 'Old Testament Survey', credits: 3 },
    { code: 'NTS 112', title: 'New Testament Survey', credits: 3 },
    { code: 'BIB 113', title: 'Bibliology', credits: 3 },
    { code: 'HER 114', title: 'Biblical Hermeneutics', credits: 3 },
    { code: 'EVA 115', title: 'Evangelism', credits: 2 },
    { code: 'CFM 116', title: 'Christian Family', credits: 2 },
    { code: 'HOM 121', title: 'Homiletics', credits: 3 },
    { code: 'CHH 122', title: 'Church History', credits: 3 },
    { code: 'THP 123', title: 'Theology Proper', credits: 3 },
    { code: 'CHR 124', title: 'Christology', credits: 3 },
    { code: 'SOT 125', title: 'Soteriology', credits: 3 },
    { code: 'PNE 126', title: 'Pneumatology', credits: 3 },
    { code: 'PRW 127', title: 'Praise and Worship', credits: 2 },
    { code: 'ECC 211', title: 'Ecclesiology', credits: 3 },
    { code: 'CAD 212', title: 'Church Administration', credits: 3 },
    { code: 'CHG 213', title: 'Church Growth', credits: 3 },
    { code: 'CHP 214', title: 'Church Planting', credits: 3 },
    { code: 'FSM 215', title: 'Foundation of Successful Ministry', credits: 2 },
    { code: 'SPF 216', title: 'Spiritual Formation', credits: 3 },
    { code: 'POS 217', title: 'Principles of Success', credits: 2 },
    { code: 'UKP 218', title: 'Understanding God\'s Kingdom Principles', credits: 3 },
    { code: 'ESC 221', title: 'Eschatology', credits: 3 },
    { code: 'ANG 222', title: 'Angelology', credits: 2 },
    { code: 'ANH 223', title: 'Anthropology & Hamartiology', credits: 3 },
    { code: 'SPW 224', title: 'Spiritual Warfare', credits: 3 },
    { code: 'SPR 225', title: 'Spiritual Realm', credits: 2 },
    { code: 'APO 226', title: 'Christian Apologetics', credits: 3 },
    { code: 'PCE 227', title: 'Pastoral Counselling & Ethics', credits: 3 },
    { code: 'MWR 228', title: 'Major World Religions', credits: 3 },
    { code: 'GRK 311', title: 'Biblical Greek', credits: 3 },
    { code: 'HEB 312', title: 'Biblical Hebrew', credits: 3 },
    { code: 'MIN 315', title: 'Ministry Practicum / Internship', credits: 4 },
    { code: 'RES 316', title: 'Research Project', credits: 3 }
  ];
  
  const courses = coursesList.map(c => ({
    course_code: c.code,
    title: c.title,
    credits: c.credits,
    is_elective: 'FALSE'
  }));
  
  // 5. Program Courses
  const program_courses = coursesList.map(c => ({
    program_code: 'DCMT-200',
    course_code: c.code,
    is_required: 'TRUE',
    sequence_order: 1
  }));
  
  // 6. Staff
  const staff = [
    { staff_number: 'STF-001', first_name: 'Joseph', last_name: 'Kiai', email: 'dean@bmi.edu', phone: '+254700000000', title: 'Dr.', role: 'DEAN_FACULTY', dept_code: 'THEO-DEPT' }
  ];
  
  // 7. Students
  const students = Array.from(studentsMap.values()).map(std => ({
    student_number: std.student_number,
    first_name: std.first_name,
    last_name: std.last_name,
    email: std.email,
    phone: std.phone,
    gender: std.gender,
    program_code: std.program_code,
    admission_date: std.admission_date,
    status: std.status,
    campus: std.campus
  }));
  
  // 8. Enrollments
  const uniqueEnrollments = new Map();
  gradesList.forEach(g => {
    const key = `${g.student_number}_${g.course_code}`;
    uniqueEnrollments.set(key, {
      student_number: g.student_number,
      course_code: g.course_code,
      academic_year: '2025/2026',
      semester: 'SEMESTER 1'
    });
  });
  const enrollments = Array.from(uniqueEnrollments.values());
  
  // 9. Grades
  const grades = gradesList.map(g => ({
    student_number: g.student_number,
    course_code: g.course_code,
    academic_year: '2025/2026',
    semester: 'SEMESTER 1',
    percentage: g.percentage
  }));

  console.log(`Summary of export:`);
  console.log(`- Faculties: ${faculties.length}`);
  console.log(`- Departments: ${departments.length}`);
  console.log(`- Programs: ${programs.length}`);
  console.log(`- Courses: ${courses.length}`);
  console.log(`- Program Courses: ${program_courses.length}`);
  console.log(`- Staff: ${staff.length}`);
  console.log(`- Students: ${students.length}`);
  console.log(`- Enrollments: ${enrollments.length}`);
  console.log(`- Grades: ${grades.length}`);

  // Write to public/UMS_Import_Template_BMI_V2.xlsx
  console.log(`\n6. Writing to V2 Template: "${templatePath}"`);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(faculties), '01_FACULTIES');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(departments), '02_DEPARTMENTS');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(programs), '03_PROGRAMS');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(courses), '04_COURSES');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(program_courses), '05_PROG_COURSES');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staff), '06_STAFF');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(students), '07_STUDENTS');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(enrollments), '08_ENROLLMENTS');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grades), '09_GRADES');
  
  XLSX.writeFile(wb, templatePath);
  console.log('Successfully wrote V2 template to public folder.');
  
  // Write to root/UMS_Import_Template_BMI.xlsx
  console.log(`Writing copy to root: "${outputRootPath}"`);
  XLSX.writeFile(wb, outputRootPath);
  console.log('Successfully wrote copy of V2 template to root folder.');
}

run().catch(console.error);
