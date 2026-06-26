import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const expectedCourses = [
  'HER 114', 'HOM 121', 'PNE 126', 'POS 217', 'CAD 212',
  'EVA 115', 'ESC 221', 'CHR 124', 'ANG 222', 'BIB 113',
  'ANH 223', 'OTS 111', 'NTS 112', 'HEB 312', 'GRK 311',
  'PRW 127', 'SPF 216', 'CHP 214', 'ENG 101', 'AWR 102',
  'ECC 211', 'UKP 218'
];

async function main() {
  await pb.collection('users').authWithPassword('admin@bmi.edu', 'BMIAdmin2024Secure');
  
  const martin = (await pb.collection('students').getFullList({
    filter: `admission_no="KEN-DP 225-538"`
  }))[0];
  
  const allRecords = await pb.collection('academic_records').getList(1, 500);
  const martinRecords = allRecords.items.filter((r: any) => r.student_id === martin.id);
  
  const coursesInDB = new Set();
  for (const record of martinRecords) {
    const course = await pb.collection('courses').getOne(record.course_id);
    coursesInDB.add(course.code);
  }
  
  console.log(`✅ Martin has ${martinRecords.length} grades in database`);
  console.log(`📋 Expected: ${expectedCourses.length} courses\n`);
  
  const missing = expectedCourses.filter(c => !coursesInDB.has(c));
  
  if (missing.length > 0) {
    console.log(`❌ Missing ${missing.length} courses:`);
    missing.forEach(c => console.log(`   - ${c}`));
  } else {
    console.log(`✅ All expected courses are present!`);
  }
}

main().catch (error);






