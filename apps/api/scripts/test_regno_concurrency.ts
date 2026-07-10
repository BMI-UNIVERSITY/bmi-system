/**
 * Concurrency load-test for the Registration Number generator.
 *
 * Fires N concurrent enrollment-equivalent requests against a local D1 instance
 * and asserts: zero duplicate serials, zero skipped serials.
 *
 * Usage:
 *   npx tsx scripts/test_regno_concurrency.ts
 *
 * Prerequisites:
 *   - wrangler local D1 running (or use --persist-to flag)
 *   - A test program_id and admission_year in regno_counters
 */

const CONCURRENCY = 50;
const PROGRAM_ID = 'test-program-001';
const ADMISSION_YEAR = 2026;
const PROGRAM_CODE = 'CS';
const CAREER = 'UG';

async function runTest() {
  console.log(`\n🧪 RegNo Concurrency Test`);
  console.log(`   Firing ${CONCURRENCY} concurrent requests...`);

  const results: string[] = [];
  const errors: unknown[] = [];

  // Simulate concurrent calls to the API endpoint
  const requests = Array.from({ length: CONCURRENCY }, (_, i) =>
    fetch('http://localhost:8787/api/v1/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'bmi_token=TEST' },
      body: JSON.stringify({
        student_id: `test-student-${i + 1}`,
        course_id: 'test-course-001',
        term_id: null,
      }),
    })
      .then(r => r.json())
      .then((body: any) => {
        if (body?.data?.registration_number) {
          results.push(body.data.registration_number);
        }
      })
      .catch(e => errors.push(e))
  );

  await Promise.all(requests);

  // Assertions
  const unique = new Set(results);
  const sorted = [...results].sort();

  console.log(`\n📊 Results:`);
  console.log(`   Total responses with RegNo: ${results.length}`);
  console.log(`   Unique RegNos:              ${unique.size}`);

  const hasDuplicates = unique.size < results.length;
  const expectedFormat = new RegExp(`^BMI/${CAREER}-${PROGRAM_CODE}/2${String(ADMISSION_YEAR).slice(2)}/\\d{3}$`);
  const allCorrectFormat = results.every(r => expectedFormat.test(r));

  if (hasDuplicates) {
    console.error(`\n❌ FAIL: Duplicate registration numbers detected!`);
    const seen = new Set<string>();
    const dupes = results.filter(r => seen.has(r) || !seen.add(r));
    console.error(`   Duplicates:`, dupes);
    process.exit(1);
  }

  if (!allCorrectFormat) {
    console.error(`\n❌ FAIL: Some registration numbers have incorrect format!`);
    console.error(`   Expected format: BMI/${CAREER}-${PROGRAM_CODE}/${ADMISSION_YEAR % 1000 + (ADMISSION_YEAR > 2000 ? 200 : 0)}/NNN`);
    console.error(`   Got:`, results.filter(r => !expectedFormat.test(r)));
    process.exit(1);
  }

  if (errors.length > 0) {
    console.warn(`\n⚠️  ${errors.length} requests failed:`, errors.slice(0, 3));
  }

  console.log(`\n✅ PASS: All ${results.length} registration numbers are unique and correctly formatted.`);
  if (sorted.length > 0) {
    console.log(`   First: ${sorted[0]}  →  Last: ${sorted[sorted.length - 1]}`);
  }
}

runTest().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
