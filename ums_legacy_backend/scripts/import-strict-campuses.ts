import fs from 'fs';
import path from 'path';
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');
pb.autoCancellation(false);

async function authAdmin() {
  const response = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@bmi.edu', password: (process.env.POCKETBASE_ADMIN_PASSWORD ?? '') })
  });
  
  if (!response.ok) {
    throw new Error(`Auth failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  pb.authStore.save(data.token, data.admin);
}

// Generate unique admission numbers
let pinCounter = 611;
function generateAdmissionNo() {
  const adminNo = `KEN-DP225-${pinCounter}`;
  pinCounter++;
  return adminNo;
}

// Generate Course Codes
const courseCodeMap: Record<string, string> = {};
let courseCounter = 101;
function generateCourseCode(courseName: string) {
  const cleanName = courseName.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (!courseCodeMap[cleanName]) {
    const prefix = cleanName.substring(0, 3) || 'GEN';
    courseCodeMap[cleanName] = `${prefix}${courseCounter++}`;
  }
  return courseCodeMap[cleanName];
}

interface ParsedGrade {
  courseName: string;
  courseCode: string;
  score: number;
}

interface OfficialStudent {
  rawName: string;
  firstName: string;
  lastName: string;
  campus: string;
  admissionNo: string;
  phone: string;
  grades: ParsedGrade[];
}

const officialStudents = new Map<string, OfficialStudent>();

function normalizeKey(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

// 1. Parse CAMPUSES.md
function parseCampuses() {
  const filePath = path.resolve(process.cwd(), './CSV FILES/CAMPUSES.md');
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  
  let currentCampus = 'Unknown';
  
  for (const line of lines) {
    if (line.includes('# **')) {
       // match "# **CAMPUS NAME**" or "# CAMPUS NAME"
       const m = line.match(/#\s*(?:\*\*)?([^`*]+)(?:\*\*)?/);
       if (m) {
           currentCampus = m[1].trim();
       }
    } else if (line.trim().startsWith('*')) {
       const rawName = line.replace('*', '').replace(/\*\*/g, '').trim();
       if (rawName) {
           const nameParts = rawName.split(/\s+/);
           const firstName = nameParts[0];
           const lastName = nameParts.slice(1).join(' ') || 'Student';
           const key = normalizeKey(rawName);
           
           if (!officialStudents.has(key)) {
               officialStudents.set(key, {
                   rawName,
                   firstName,
                   lastName,
                   campus: currentCampus,
                   admissionNo: '',
                   phone: '0000000000',
                   grades: []
               });
           }
       }
    }
  }
}

// Map grade to student securely
function assignGrade(studentRawName: string, courseName: string, gradeStr: string, admissionNoCandidate?: string) {
    if (!studentRawName || !courseName || !gradeStr) return;
    
    // Check if cell is 'NL' or 'NK' or invalid
    if (gradeStr.trim() === 'NL' || gradeStr.trim() === 'NK' || gradeStr.includes('REF!')) return;
    
    const match = gradeStr.trim().match(/^(\d+)/);
    if (!match) return; // Not a number
    
    const key = normalizeKey(studentRawName);
    const student = officialStudents.get(key);
    
    if (student) {
        const score = parseInt(match[1], 10);
        const courseCode = generateCourseCode(courseName);
        
        // Prevent duplicate grades for same course
        if (!student.grades.find(g => g.courseCode === courseCode)) {
            student.grades.push({ courseName: courseName.trim(), courseCode, score });
        }
        
        // Setup admission number if valid and not already set
        if (admissionNoCandidate && admissionNoCandidate.trim().length >= 4) {
             let adm = admissionNoCandidate.trim();
             if (!adm.startsWith('KEN-DP225')) {
                 const parts = adm.split('-');
                 adm = `KEN-DP225-${parts[parts.length - 1]}`;
             }
             if (!student.admissionNo || !student.admissionNo.startsWith('KEN-DP')) {
                 student.admissionNo = adm;
             }
        }
    }
}

// 2. Parse Transcript (Horizontal)
function parseTranscriptHorizontal() {
  const filePath = path.resolve(process.cwd(), './CSV FILES/diploma STUDENTS PERFORMANCE (TRANSCRIPT) - Sheet1 (2).csv');
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  
  const headers = lines[0].split(',').map(h => h.trim());
  const courseNames = headers.slice(3).map(h => h.trim());
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.replace(/,/g, '').trim() === '') continue;
    
    const parts = line.split(',');
    const rawName = parts[0].trim();
    if (!rawName || rawName.toLowerCase().includes('class') || rawName.toLowerCase().includes('campus')) continue;
    
    const admissionNo = parts[1]?.trim() || '';
    
    for (let c = 0; c < courseNames.length; c++) {
      if (courseNames[c]) {
         assignGrade(rawName, courseNames[c], parts[c + 3], admissionNo);
      }
    }
  }
}

// 3. Parse Mukurweini (Vertical)
function parseMukurweiniVertical() {
  const filePath = path.resolve(process.cwd(), './CSV FILES/DIPLOMA MUKURWEINI Class Final GRADES  - Sheet2 (1).csv');
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  
  const studentNamesRow = lines[2].split(',');
  
  // Strict map column index to student raw name
  const colToStudent = new Map<number, string>();
  for (let c = 3; c < studentNamesRow.length; c++) {
      const name = studentNamesRow[c].trim();
      if (name) colToStudent.set(c, name);
  }
  
  for (let i = 3; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const courseName = parts[1]?.trim();
    if (!courseName) continue;
    
    for (const [col, studentRawName] of colToStudent.entries()) {
        const gradeStr = parts[col]?.trim();
        if (gradeStr) {
           assignGrade(studentRawName, courseName, gradeStr);
        }
    }
  }
}

// 4. Parse Kiambu (Vertical)
function parseKiambuVertical() {
    const filePath = path.resolve(process.cwd(), './CSV FILES/KIAMBU DIPLOMA GRADES - Sheet1.csv');
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < rawContent.length; i++) {
        const char = rawContent[i];
        if (char === '"' && (i === 0 || rawContent[i-1] !== '\\')) {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.replace(/\r?\n/g, ' ').trim());
            currentCell = '';
        } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentCell.replace(/\r?\n/g, ' ').trim());
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.replace(/\r?\n/g, ' ').trim());
        rows.push(currentRow);
    }
    
    const admRow = rows[2];
    const nameRow = rows[3];
    if (!nameRow || !admRow) return;
    
    const colToStudent = new Map<number, {name: string, adm: string}>();
    for (let c = 2; c < nameRow.length; c++) {
        const rawName = nameRow[c].replace(/"/g, '').trim();
        if (rawName) {
            colToStudent.set(c, { name: rawName, adm: admRow[c]?.trim() || '' });
        }
    }
    
    for (let i = 4; i < rows.length; i++) {
        const row = rows[i];
        const courseName = row[1]?.replace(/"/g, '').trim();
        if (!courseName) continue;
        
        for (const [col, stInfo] of colToStudent.entries()) {
            const gradeStr = row[col]?.trim();
            if (gradeStr) {
                assignGrade(stInfo.name, courseName, gradeStr, stInfo.adm);
            }
        }
    }
}

async function cleanupDatabase() {
    console.log("Cleaning up previous data (grades, enrollments, students)...");
    
    const batchDelete = async (collection: string) => {
        let items = await pb.collection(collection).getFullList({ requestKey: null });
        console.log(`Deleting ${items.length} records from ${collection}...`);
        for (const item of items) {
            await pb.collection(collection).delete(item.id, { requestKey: null });
        }
    };
    
    await batchDelete('grades');
    await batchDelete('enrollments');
    await batchDelete('students');
    console.log("Cleanup complete.");
}

async function run() {
    try {
        console.log("Parsing CAMPUSES.md...");
        parseCampuses();
        console.log(`Found ${officialStudents.size} official students.`);
        
        console.log("Parsing Transcripts...");
        parseTranscriptHorizontal();
        parseMukurweiniVertical();
        parseKiambuVertical();
        
        const studentsArr = Array.from(officialStudents.values());
        
        // Ensure all students have admission numbers
        for (const s of studentsArr) {
             if (!s.admissionNo) {
                 s.admissionNo = generateAdmissionNo();
             }
        }

        const dryRunOnly = process.argv.includes('--dry-run');
        
        if (dryRunOnly) {
             console.log("\\n--- DRY RUN SUMMARY ---");
             const sample = studentsArr.find(s => s.grades.length > 0) || studentsArr[0];
             console.log("Sample Parsed Student:", JSON.stringify(sample, null, 2));
             console.log("Total Official Students mapped:", studentsArr.length);
             return;
        }

        await authAdmin();
        await cleanupDatabase();
        
        console.log("Injecting records into PocketBase...");

        // Setup Faculty / Dept
        let deptId = '';
        try {
            const d = await pb.collection('departments').getFirstListItem('dept_code="DEPT-THEO"', { requestKey: null });
            deptId = d.id;
        } catch(e) {
            let facultyId = '';
            try {
                const f = await pb.collection('faculties').getFirstListItem('faculty_code="FAC-THEO"', { requestKey: null });
                facultyId = f.id;
            } catch {
                const f = await pb.collection('faculties').create({
                    faculty_code: 'FAC-THEO',
                    name: 'Faculty of Theology'
                }, { requestKey: null });
                facultyId = f.id;
            }
            const d = await pb.collection('departments').create({
                dept_code: 'DEPT-THEO',
                name: 'Department of Christian Ministry',
                faculty_code: facultyId
            }, { requestKey: null });
            deptId = d.id;
        }

        let programId = '';
        try {
            const p = await pb.collection('programs').getFirstListItem('program_code="DIP-THEO"', { requestKey: null });
            programId = p.id;
        } catch(e) {
            const p = await pb.collection('programs').create({
                program_code: 'DIP-THEO',
                name: 'DIPLOMA IN CHRISTIAN MINISTRY AND THEOLOGY',
                degree_level: 'Diploma',
                total_credits: 120,
                dept_code: deptId
            }, { requestKey: null });
            programId = p.id;
        }

        // Setup Courses
        const uniqueCourses = new Map<string, string>(); // code -> name
        studentsArr.forEach(s => s.grades.forEach(g => uniqueCourses.set(g.courseCode, g.courseName)));
        
        const courseIdMap = new Map<string, string>(); 
        for (const [code, name] of uniqueCourses.entries()) {
            try {
                const c = await pb.collection('courses').getFirstListItem(`course_code="${code}"`, { requestKey: null });
                courseIdMap.set(code, c.id);
            } catch {
                const c = await pb.collection('courses').create({
                    course_code: code,
                    title: name,
                    credits: 3,
                    level: 'Diploma',
                    status: 'Published'
                }, { requestKey: null });
                courseIdMap.set(code, c.id);
            }
        }

        // Insert Students and Grades
        for (const s of studentsArr) {
            const st = await pb.collection('students').create({
                student_number: s.admissionNo,
                first_name: s.firstName,
                last_name: s.lastName + ` (${s.campus})`,
                email: `${s.admissionNo.toLowerCase().replace(/-/g, '')}@student.bmi.edu`,
                phone: s.phone,
                gender: 'Female', 
                status: 'Active',
                program_code: programId
            }, { requestKey: null });
            
            const studentId = st.id;
            
            for (const g of s.grades) {
                const cId = courseIdMap.get(g.courseCode);
                if (!cId) continue;
                
                const en = await pb.collection('enrollments').create({
                    student_number: studentId,
                    course_code: cId,
                    academic_year: '2024/2025',
                    semester: 'Semester 1'
                }, { requestKey: null });
                
                let letter = 'F';
                if (g.score >= 90) letter = 'A';
                else if (g.score >= 80) letter = 'B+';
                else if (g.score >= 70) letter = 'B';
                else if (g.score >= 60) letter = 'C+';
                else if (g.score >= 50) letter = 'C';
                
                await pb.collection('grades').create({
                    enrollment_id: en.id,
                    percentage: g.score,
                    grade_letter: letter,
                    gpa: (g.score / 100) * 4.0
                }, { requestKey: null });
            }
        }
        
        console.log("Strict Data Migration successfully completed!");
       
    } catch (e) {
        console.error("Error running import:", e);
    }
}

run();
