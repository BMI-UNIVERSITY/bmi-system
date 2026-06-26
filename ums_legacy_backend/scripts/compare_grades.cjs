const XLSX = require('xlsx');
const path = require('path');

const csvDir = 'd:/AGENTS/bmi-ums/CSV FILES';

function cleanName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function run() {
  // 1. Read transcript.csv
  const trWorkbook = XLSX.readFile(path.join(csvDir, 'diploma STUDENTS PERFORMANCE (TRANSCRIPT) - Sheet1 (3).csv'));
  const trSheet = trWorkbook.Sheets[trWorkbook.SheetNames[0]];
  const trData = XLSX.utils.sheet_to_json(trSheet, { header: 1 });
  
  const trHeaders = trData[2] || [];
  const trCourses = trHeaders.slice(7).map(h => h.trim().toUpperCase());
  const trStudents = {};
  
  for (let i = 4; i < trData.length; i++) {
    const row = trData[i];
    if (!row || row.length === 0) continue;
    const name = String(row[0] || '').trim();
    if (!name) continue;
    
    const grades = {};
    trCourses.forEach((course, colIdx) => {
      const val = row[colIdx + 7];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        grades[course] = parseFloat(val);
      }
    });
    
    trStudents[cleanName(name)] = {
      rawName: name,
      grades
    };
  }
  
  // 2. Read Mukurweini.csv
  const mukWorkbook = XLSX.readFile(path.join(csvDir, 'DIPLOMA MUKURWEINI Class Final GRADES  - Sheet2 (2).csv'));
  const mukSheet = mukWorkbook.Sheets[mukWorkbook.SheetNames[0]];
  const mukData = XLSX.utils.sheet_to_json(mukSheet, { header: 1 });
  
  const mukNames = (mukData[2] || []).slice(3).map(n => String(n || '').trim()).filter(n => n.length > 0);
  
  console.log('--- COMPARING MUKURWEINI GRADES WITH TRANSCRIPT GRADES ---');
  
  // Courses mapping from Mukurweini to transcript header keys
  const courseMapping = {
    'HERMENEUTICS': 'BIBLICAL HERMENEUTICS',
    'HOMILETICS': 'HOMILETICS',
    'PNEUMATOLOGY': 'PNEUMATOLOGY',
    'PRINCIPLES OF SUCCESS': 'PRINCIPLE OF SUCCESS',
    'CHURCH ADMINSTRATION': 'CHURCH ADMIN',
    'EVANGELISM': 'EVANGELISM',
    'ESCHATOLOGY': 'ESCHATOLOGY',
    'CHRISTOLOGY': 'CHRISTOLOGY',
    'ANGELOLOGY & DEMONOLOGY': 'ANGELOLOGY',
    'BIBLIOLOGY': 'BIBLIOLOGY',
    'ANTHROPOLOGY & HARMATIOLOGY': 'HAMARTIOLOGY',
    'O.T. SURVEY': 'OLD TESTAMENT SURVEY'
  };
  
  mukNames.forEach((n, colOffset) => {
    const colIdx = colOffset + 3;
    const cleanN = cleanName(n);
    
    // Find in transcript
    let trStudent = null;
    const matchedKeys = Object.keys(trStudents).filter(k => k === cleanN || k.includes(cleanN) || cleanN.includes(k));
    if (matchedKeys.length > 0) {
      trStudent = trStudents[matchedKeys[0]];
    }
    
    if (trStudent) {
      console.log(`\nStudent: "${n}" matched transcript student: "${trStudent.rawName}"`);
      
      for (let r = 3; r < mukData.length; r++) {
        const row = mukData[r];
        if (!row || row.length === 0) continue;
        const rawCourse = String(row[1] || '').trim().toUpperCase();
        const scoreVal = row[colIdx];
        if (scoreVal === undefined || scoreVal === null || String(scoreVal).trim() === '' || String(scoreVal).trim() === '-') continue;
        
        const mappedCourse = courseMapping[rawCourse];
        if (!mappedCourse) {
          console.log(`  Course not in mapping: "${rawCourse}"`);
          continue;
        }
        
        const trScore = trStudent.grades[mappedCourse];
        const mukScore = parseFloat(String(scoreVal).replace(/[^\d.]/g, ''));
        
        if (trScore === undefined) {
          console.log(`  Course "${mappedCourse}": In Mukurweini = ${mukScore}, missing in Transcript`);
        } else if (trScore !== mukScore) {
          console.log(`  Course "${mappedCourse}": In Mukurweini = ${mukScore}, in Transcript = ${trScore} (DIFFERENCE!)`);
        } else {
          // console.log(`  Course "${mappedCourse}": Match! (${mukScore})`);
        }
      }
    } else {
      console.log(`Student "${n}" not found in transcript.`);
    }
  });
}

run();
