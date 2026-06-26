import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function main() {
  await pb.collection('users').authWithPassword('admin@bmi.edu', 'BMIAdmin2024Secure');
  
  const martin = (await pb.collection('students').getFullList({
    filter: `admission_no="KEN-DP 225-538"`
  }))[0];
  
  console.log(`✅ Found: ${martin.full_name} (${martin.admission_no})\n`);
  
  // Get ALL records for Martin
  const allRecords = await pb.collection('academic_records').getList(1, 500);
  const martinRecords = allRecords.items.filter((r: any) => r.student_id === martin.id);
  
  console.log(`📊 Total records: ${martinRecords.length}\n`);
  
  // Group by course_id to find duplicates
  const byCourse = new Map<string, any[]>();
  
  for (const record of martinRecords) {
    const courseId = record.course_id;
    if (!byCourse.has(courseId)) {
      byCourse.set(courseId, []);
    }
    byCourse.get(courseId)!.push(record);
  }
  
  // Find duplicates
  const duplicates = Array.from(byCourse.entries()).filter(([_, records]) => records.length > 1);
  
  if (duplicates.length > 0) {
    console.log(`❌ Found ${duplicates.length} courses with duplicate records:\n`);
    
    for (const [courseId, records] of duplicates) {
      const course = await pb.collection('courses').getOne(courseId);
      console.log(`${course.code} - ${course.title}:`);
      for (const record of records) {
        console.log(`   ID: ${record.id}, Score: ${record.total_score}, Grade: ${record.grade}, Created: ${record.created}`);
      }
      console.log('');
    }
  } else {
    console.log(`✅ No duplicate courses found!`);
  }
  
  // Show unique course count
  console.log(`\n📚 Unique courses: ${byCourse.size}`);
}

main().catch (error);






