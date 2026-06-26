const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const csvDir = 'd:/AGENTS/bmi-ums/CSV FILES';

// 1. Read CAMPUSES.md and parse into a dictionary of CampusName -> list of names
function parseCampusesMd() {
  const content = fs.readFileSync(path.join(csvDir, 'CAMPUSES.md'), 'utf8');
  const sections = content.split(/# \*\*|# /);
  
  const campusGroups = {};
  
  sections.forEach(sec => {
    const lines = sec.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;
    
    // The first line contains the campus name
    const headingMatch = lines[0].match(/([A-Z0-9\s]+?)\s*CAMPUS\*\*/i) || lines[0].match(/([A-Z0-9\s]+?)\s*CAMPUS/i) || [null, lines[0]];
    const campusName = headingMatch[1] ? headingMatch[1].trim() : lines[0].replace(/\*\*/g, '').trim();
    
    const names = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].startsWith('*')) {
        const name = lines[i].replace(/^\*\s*|^\*\s*&#x20;\s*|\*\s*$/g, '')
          .replace(/\*\*/g, '')
          .replace(/â\x80\x99/g, "'") // fix encoding issues
          .trim();
        if (name) names.push(name);
      }
    }
    
    if (campusName && names.length > 0) {
      campusGroups[campusName.toUpperCase()] = names;
    }
  });
  
  return campusGroups;
}

function cleanName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function run() {
  const campusGroups = parseCampusesMd();
  console.log('Parsed campus groups from CAMPUSES.md:');
  Object.keys(campusGroups).forEach(c => {
    console.log(`- ${c}: ${campusGroups[c].length} students`);
  });
  
  // Read transcript students
  const transcriptPath = path.join(csvDir, 'diploma STUDENTS PERFORMANCE (TRANSCRIPT) - Sheet1 (3).csv');
  const workbook = XLSX.readFile(transcriptPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const mapped = [];
  const unmatched = [];
  
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    const name = String(row[0] || '').trim();
    const csvCampus = String(row[1] || '').trim();
    const adm = String(row[2] || '').trim();
    
    if (!name && !adm) continue;
    
    let campus = '';
    let matchReason = '';
    
    // If campus is already in CSV row, map it
    if (csvCampus && csvCampus !== 'undefined' && csvCampus !== '') {
      if (csvCampus === 'KARATINA A') {
        campus = 'Karatina 1';
      } else if (csvCampus === 'KARATINA B') {
        campus = 'Karatina 2';
      } else {
        // Capitalize first letter
        campus = csvCampus.charAt(0).toUpperCase() + csvCampus.slice(1).toLowerCase();
      }
      matchReason = `CSV column: "${csvCampus}"`;
    } else {
      // Find in CAMPUSES.md lists
      const cn = cleanName(name);
      let foundCampus = '';
      
      for (const [campName, studentList] of Object.entries(campusGroups)) {
        for (const stName of studentList) {
          const cStName = cleanName(stName);
          
          // Check if names match exactly or fuzzy
          const isMatch = (cStName === cn) ||
            (cStName.includes(cn) && cn.length > 5) ||
            (cn.includes(cStName) && cStName.length > 5) ||
            // check first and last name match
            (cn.split(' ')[0] === cStName.split(' ')[0] && cn.split(' ').pop() === cStName.split(' ').pop() && cn.length > 3);
            
          if (isMatch) {
            foundCampus = campName;
            matchReason = `Matched name "${stName}" in CAMPUSES.md`;
            break;
          }
        }
        if (foundCampus) break;
      }
      
      if (foundCampus) {
        if (foundCampus === 'KARATINA 1') campus = 'Karatina 1';
        else if (foundCampus === 'KARATINA 2') campus = 'Karatina 2';
        else {
          campus = foundCampus.charAt(0).toUpperCase() + foundCampus.slice(1).toLowerCase();
        }
      }
    }
    
    if (campus) {
      mapped.push({ name, adm, campus, matchReason });
    } else {
      unmatched.push({ name, adm });
    }
  }
  
  console.log(`\nMapped ${mapped.length} students to campus.`);
  console.log(`Unmatched ${unmatched.length} students.`);
  
  if (unmatched.length > 0) {
    console.log('\nUnmatched students list:');
    unmatched.forEach(u => console.log(`- "${u.name}" (Adm: ${u.adm})`));
  }
  
  console.log('\nMapped students sample:');
  mapped.slice(0, 15).forEach(m => {
    console.log(`- "${m.name}" [${m.adm}] -> Campus: "${m.campus}" (${m.matchReason})`);
  });
}

run();
