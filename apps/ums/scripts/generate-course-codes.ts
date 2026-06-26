/**
 * BMI UMS - Course Code Generator
 * Auto-generates standardized course codes for all courses
 */

interface CourseInfo {
  name: string;
  code: string;
  category: string;
  level: number;
}

// Generate course codes based on course names
function generateCourseCode(courseName: string, index: number): string {
  // Extract key words and create acronym
  const words = courseName.split('_').filter(w => w.length > 0);
  
  // Category prefixes
  const categoryMap: Record<string, string> = {
    'THEOLOGY': 'THEO',
    'BIBLICAL': 'BIBL',
    'CHURCH': 'CHUR',
    'CHRISTIAN': 'CHRS',
    'SPIRITUAL': 'SPIR',
    'PASTORAL': 'PAST',
    'MINISTRY': 'MINS'
  };
  
  // Determine category prefix
  let prefix = 'THEO'; // Default to theology
  for (const [key, value] of Object.entries(categoryMap)) {
    if (courseName.includes(key)) {
      prefix = value;
      break;
    }
  }
  
  // Generate number (100-level for foundational, 200-level for intermediate, 300-level for advanced)
  let level = 100;
  if (courseName.includes('ADVANCED') || courseName.includes('PROPER') || courseName.includes('APOLOGETICS')) {
    level = 300;
  } else if (courseName.includes('SURVEY') || courseName.includes('FORMATION') || courseName.includes('PRINCIPLES')) {
    level = 200;
  }
  
  const number = level + index;
  
  return `${prefix}${number}`;
}

// All courses from the template
const courses: CourseInfo[] = [
  { name: 'HOMILETICS', code: '', category: 'Ministry', level: 200 },
  { name: 'HERMENEUTICS', code: '', category: 'Biblical Studies', level: 200 },
  { name: 'CHURCH_ADMIN', code: '', category: 'Church Leadership', level: 200 },
  { name: 'PNEUMATOLOGY', code: '', category: 'Systematic Theology', level: 200 },
  { name: 'EVANGELISM', code: '', category: 'Ministry', level: 100 },
  { name: 'ESCHATOLOGY', code: '', category: 'Systematic Theology', level: 300 },
  { name: 'PRINCIPLE_OF_SUCCESS', code: '', category: 'Personal Development', level: 100 },
  { name: 'ANGELOLOGY', code: '', category: 'Systematic Theology', level: 200 },
  { name: 'HAMARTIOLOGY', code: '', category: 'Systematic Theology', level: 200 },
  { name: 'NEW_SURVEY', code: '', category: 'Biblical Studies', level: 100 },
  { name: 'OLD_SURVEY', code: '', category: 'Biblical Studies', level: 100 },
  { name: 'CHRISTOLOGY', code: '', category: 'Systematic Theology', level: 200 },
  { name: 'CHURCH_GROWTH', code: '', category: 'Church Leadership', level: 200 },
  { name: 'BIBLIOLOGY', code: '', category: 'Systematic Theology', level: 100 },
  { name: 'THEOLOGY_PROPER', code: '', category: 'Systematic Theology', level: 300 },
  { name: 'SOTERIOLOGY', code: '', category: 'Systematic Theology', level: 200 },
  { name: 'CHRISTIAN_FAMILY', code: '', category: 'Practical Theology', level: 200 },
  { name: 'CHURCH_PLANTING', code: '', category: 'Church Leadership', level: 300 },
  { name: 'CHURCH_HISTORY', code: '', category: 'Historical Theology', level: 200 },
  { name: 'PRAISE_AND_WORSHIP', code: '', category: 'Ministry', level: 100 },
  { name: 'SPIRITUAL_WARFARE', code: '', category: 'Spiritual Formation', level: 200 },
  { name: 'FOUNDATION_SUCCESSFUL_MINISTRY', code: '', category: 'Ministry', level: 100 },
  { name: 'SPIRITUAL_FORMATION', code: '', category: 'Spiritual Formation', level: 200 },
  { name: 'KINGDOM_PRINCIPLES', code: '', category: 'Theology', level: 200 },
  { name: 'PRINCIPLES_OF_SUCCESS', code: '', category: 'Personal Development', level: 100 },
  { name: 'UNDERSTANDING_GODS', code: '', category: 'Theology', level: 100 },
  { name: 'ECCLESIOLOGY', code: '', category: 'Systematic Theology', level: 200 },
  { name: 'PASTORAL_COUNSELLING_ETHICS', code: '', category: 'Pastoral Ministry', level: 300 },
  { name: 'GREEK', code: '', category: 'Biblical Languages', level: 200 },
  { name: 'CHRISTIAN_APOLOGETICS', code: '', category: 'Apologetics', level: 300 },
  { name: 'HEBREW', code: '', category: 'Biblical Languages', level: 200 },
  { name: 'WORLD_RELIGION', code: '', category: 'Comparative Religion', level: 200 },
  { name: 'SPIRITUAL_REALM', code: '', category: 'Spiritual Formation', level: 200 }
];

// Generate codes with better logic
const courseMap: Record<string, CourseInfo> = {};

// Systematic Theology courses
let theoCounter = 101;
courses.filter(c => c.category === 'Systematic Theology').forEach(c => {
  c.code = `THEO${theoCounter}`;
  courseMap[c.name] = c;
  theoCounter++;
});

// Biblical Studies courses
let biblCounter = 101;
courses.filter(c => c.category === 'Biblical Studies').forEach(c => {
  c.code = `BIBL${biblCounter}`;
  courseMap[c.name] = c;
  biblCounter++;
});

// Church Leadership courses
let churCounter = 201;
courses.filter(c => c.category === 'Church Leadership').forEach(c => {
  c.code = `CHUR${churCounter}`;
  courseMap[c.name] = c;
  churCounter++;
});

// Ministry courses
let minsCounter = 101;
courses.filter(c => c.category === 'Ministry').forEach(c => {
  c.code = `MINS${minsCounter}`;
  courseMap[c.name] = c;
  minsCounter++;
});

// Spiritual Formation courses
let spirCounter = 201;
courses.filter(c => c.category === 'Spiritual Formation').forEach(c => {
  c.code = `SPIR${spirCounter}`;
  courseMap[c.name] = c;
  spirCounter++;
});

// Pastoral Ministry courses
let pastCounter = 301;
courses.filter(c => c.category === 'Pastoral Ministry').forEach(c => {
  c.code = `PAST${pastCounter}`;
  courseMap[c.name] = c;
  pastCounter++;
});

// Biblical Languages courses
let langCounter = 201;
courses.filter(c => c.category === 'Biblical Languages').forEach(c => {
  c.code = `LANG${langCounter}`;
  courseMap[c.name] = c;
  langCounter++;
});

// Personal Development courses
let devCounter = 101;
courses.filter(c => c.category === 'Personal Development').forEach(c => {
  c.code = `DEVL${devCounter}`;
  courseMap[c.name] = c;
  devCounter++;
});

// Practical Theology courses
let practCounter = 201;
courses.filter(c => c.category === 'Practical Theology').forEach(c => {
  c.code = `PRAC${practCounter}`;
  courseMap[c.name] = c;
  practCounter++;
});

// Historical Theology courses
let histCounter = 201;
courses.filter(c => c.category === 'Historical Theology').forEach(c => {
  c.code = `HIST${histCounter}`;
  courseMap[c.name] = c;
  histCounter++;
});

// Theology (general) courses
let thlgCounter = 101;
courses.filter(c => c.category === 'Theology').forEach(c => {
  c.code = `THLG${thlgCounter}`;
  courseMap[c.name] = c;
  thlgCounter++;
});

// Comparative Religion courses
let compCounter = 201;
courses.filter(c => c.category === 'Comparative Religion').forEach(c => {
  c.code = `COMP${compCounter}`;
  courseMap[c.name] = c;
  compCounter++;
});

// Apologetics courses
let apolCounter = 301;
courses.filter(c => c.category === 'Apologetics').forEach(c => {
  c.code = `APOL${apolCounter}`;
  courseMap[c.name] = c;
  apolCounter++;
});

// Export the mapping
console.log('Course Code Mapping:');
console.log('===================\n');

Object.values(courseMap).sort((a, b) => a.code.localeCompare(b.code)).forEach(course => {
  console.log(`${course.code.padEnd(10)} | ${course.name.padEnd(35)} | ${course.category}`);
});

console.log('\n\nTypeScript Mapping Object:');
console.log('==========================\n');
console.log('export const COURSE_CODES: Record<string, string> = {');
Object.values(courseMap).sort((a, b) => a.name.localeCompare(b.name)).forEach(course => {
  console.log(`  '${course.name}': '${course.code}',`);
});
console.log('};');

console.log('\n\nJSON Format:');
console.log('============\n');
console.log(JSON.stringify(courseMap, null, 2));

export { courseMap, CourseInfo };






