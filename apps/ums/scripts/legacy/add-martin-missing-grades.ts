import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const missingGrades = [
  { course_code: 'HER 114', score: 89 },
  { course_code: 'PNE 126', score: 78 },
  { course_code: 'PRW 127', score: 78 },
  { course_code: 'ENG 101', score: 92 },
  { course_code: 'ECC 211', score: 92 }
];

function calculateGrade(score: number): { grade: string; grade_point: number } {
  if (score >= 90) return { grade: 'A', grade_point: 4.0 };
  if (score >= 80) return { grade: 'A-', grade_point: 3.7 };
  if (score >= 75) return { grade: 'B+', grade_point: 3.3 };
  if (score >= 70) return { grade: 'B', grade_point: 3.0 };
  if (score >= 65) return { grade: 'B-', grade_point: 2.7 };
  if (score >= 60) return { grade: 'C+', grade_point: 2.3 };
  if (score >= 55) return { grade: 'C', grade_point: 2.0 };
  if (score >= 50) return { grade: 'C-', grade_point: 1.7 };
  return { grade: 'F', grade_point: 0.0 };
}

async function main() {
  await pb.collection('users').authWithPassword('admin@bmi.edu', 'BMIAdmin2024Secure');
  
  // Get Martin
  const martin = (await pb.collection('students').getFullList({
    filter: `admission_no="KEN-DP 225-538"`
  }))[0];
  
  console.log(`✅ Found: ${martin.full_name} (${martin.admission_no})\n`);
  
  // Get all courses
  const courses = await pb.collection('courses').getFullList();
  const courseMap = new Map(courses.map((c: any) => [c.code, c.id]));
  
  let added = 0;
  
  for (const { course_code, score } of missingGrades) {
    const courseId = courseMap.get(course_code);
    if (!courseId) {
      console.log(`❌ Course ${course_code} not found`);
      continue;
    }
    
    const { grade, grade_point } = calculateGrade(score);
    
    try {
      await pb.collection('academic_records').create({
        student_id: martin.id,
        course_id: courseId,
        total_score: score,
        ca_score: 0,
        exam_score: score,
        grade,
        grade_point,
        remarks: score >= 50 ? 'Pass' : 'Fail',
        academic_year: '2024/2025',
        semester: 'Semester 1'
      });
      
      console.log(`✅ Added ${course_code}: ${score} → ${grade}`);
      added++;
    } catch (error) {
      console.log(`❌ Failed to add ${course_code}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Added ${added} missing grades for Martin`);
}

main().catch (error);






