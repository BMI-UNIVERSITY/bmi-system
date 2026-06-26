import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function main() {
  await pb.collection('users').authWithPassword('admin@bmi.edu', 'BMIAdmin2024Secure');
  
  const martin = (await pb.collection('students').getFullList({
    filter: `admission_no="KEN-DP 225-538"`
  }))[0];
  
  console.log(`✅ Found: ${martin.full_name} (ID: ${martin.id})\n`);
  
  // Test the API endpoint that the frontend uses
  const token = pb.authStore.token;
  
  const response = await fetch(`http://127.0.0.1:3000/api/v1/grades?studentId=${martin.id}&expand=student_id,student_id.study_center_id,course_id,course_id.module_id&perPage=500`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  
  console.log(`📊 API Response Status: ${data.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`📊 Total records returned: ${data.data?.items?.length || data.data?.length || 0}\n`);
  
  const items = data.data?.items || data.data || [];
  
  // Group by course code to find duplicates
  const byCourseCode = new Map<string, any[]>();
  
  for (const item of items) {
    const courseCode = item.courseCode || item.expand?.course_id?.code || 'UNKNOWN';
    if (!byCourseCode.has(courseCode)) {
      byCourseCode.set(courseCode, []);
    }
    byCourseCode.get(courseCode)!.push(item);
  }
  
  // Find duplicates
  const duplicates = Array.from(byCourseCode.entries()).filter(([_, records]) => records.length > 1);
  
  if (duplicates.length > 0) {
    console.log(`❌ Found ${duplicates.length} courses with duplicate records in API response:\n`);
    
    for (const [courseCode, records] of duplicates) {
      console.log(`${courseCode}:`);
      for (const record of records) {
        console.log(`   ID: ${record.id}, Score: ${record.totalScore || record.total_score}, Grade: ${record.grade}`);
      }
      console.log('');
    }
  } else {
    console.log(`✅ No duplicate courses in API response!`);
  }
  
  console.log(`\n📚 Unique courses in API: ${byCourseCode.size}`);
  console.log(`📚 Total items in API: ${items.length}`);
}

main().catch (error);






