import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function main() {
  // Auth
  await pb.collection('users').authWithPassword('admin@bmi.edu', 'BMIAdmin2024Secure');
  
  // Get Martin
  const martin = (await pb.collection('students').getFullList({
    filter: `admission_no="KEN-DP 225-538"`
  }))[0];
  
  console.log(`✅ Found: ${martin.full_name} (ID: ${martin.id})\n`);
  
  // Call the API endpoint that the frontend uses
  const response = await fetch(`http://localhost:3001/api/v1/grades?studentId=${martin.id}`, {
    headers: {
      'Authorization': `Bearer ${pb.authStore.token}`
    }
  });
  
  const data = await response.json();
  
  if (data.success) {
    const items = data.data.items || data.data;
    console.log(`📊 API returned ${items.length} grade records\n`);
    
    // Group by course code
    const byCourse = new Map<string, any[]>();
    for (const item of items) {
      const code = item.courseCode || item.course_code;
      if (!byCourse.has(code)) {
        byCourse.set(code, []);
      }
      byCourse.get(code)!.push(item);
    }
    
    // Find duplicates
    const duplicates = Array.from(byCourse.entries()).filter(([_, records]) => records.length > 1);
    
    if (duplicates.length > 0) {
      console.log(`❌ API is returning ${duplicates.length} courses with duplicates:\n`);
      for (const [code, records] of duplicates) {
        console.log(`${code}:`);
        for (const record of records) {
          console.log(`   Score: ${record.totalScore || record.total_score}, Grade: ${record.grade}, ID: ${record.id}`);
        }
        console.log('');
      }
    } else {
      console.log(`✅ No duplicates in API response!`);
      console.log(`📚 Unique courses: ${byCourse.size}`);
    }
  } else {
    console.log(`❌ API error: ${data.error}`);
  }
}

main().catch (error);






