import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function main() {
  // Auth
  await pb.collection('users').authWithPassword('admin@bmi.edu', 'BMIAdmin2024Secure');
  
  // Find Martin
  const students = await pb.collection('students').getFullList({
    filter: `admission_no="KEN-DP 225-538"`
  });
  
  if (students.length === 0) {
    console.log('❌ Martin not found!');
    return;
  }
  
  const martin = students[0];
  console.log(`✅ Found: ${martin.full_name} (${martin.admission_no})`);
  console.log(`   ID: ${martin.id}\n`);
  
  // Check grades
  try {
    const grades = await pb.collection('grades').getFullList({
      filter: `student_id="${martin.id}"`,
      expand: 'course_id'
    });
    
    console.log(`📊 Martin has ${grades.length} grade records in 'grades' collection:\n`);
    
    if (grades.length > 0) {
      grades.forEach((g: any) => {
        console.log(`   ${g.expand?.course_id?.code || 'N/A'} - ${g.expand?.course_id?.title || 'N/A'}: ${g.total_score} (${g.letter_grade})`);
      });
    } else {
      console.log('   No grades found in grades collection!');
    }
  } catch (error) {
    console.log(`⚠ grades collection error: ${e.message}`);
  }
  
  // Try academic_records
  try {
    const allRecords = await pb.collection('academic_records').getList(1, 500);
    const martinRecords = allRecords.items.filter((r: any) => r.student_id === martin.id);
    
    console.log(`\n📊 Martin has ${martinRecords.length} records in 'academic_records' collection:\n`);
    
    if (martinRecords.length > 0) {
      // Get course details
      for (const record of martinRecords) {
        try {
          const course = await pb.collection('courses').getOne(record.course_id);
          console.log(`   ${course.code} - ${course.title}: ${record.total_score} (${record.grade})`);
        } catch (error) {
          console.log(`   ${record.course_id}: ${record.total_score} (${record.grade})`);
        }
      }
    } else {
      console.log('   No records found in academic_records collection!');
    }
  } catch (error) {
    console.log(`⚠ academic_records collection error: ${e.message}`);
  }
}

main().catch (error);






