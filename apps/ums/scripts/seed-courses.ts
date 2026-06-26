/**
 * BMI UMS - Seed Courses Collection
 * Populates the courses collection with all course codes and metadata
 * Usage: npx tsx scripts/seed-courses.ts
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bmi.ac.ke';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';

interface CourseData {
  code: string;
  name: string;
  fullName: string;
  category: string;
  level: number;
  credits: number;
}

function getPocketBase(): PocketBase {
  return new PocketBase(PB_URL);
}

async function authenticateAdmin(pb: PocketBase) {
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✓ Authenticated as admin');
  } catch (error) {
    console.error('✗ Failed to authenticate:', error.message);
    throw error;
  }
}

function loadCourseMappings(): Record<string, CourseData> {
  const mappingPath = path.join(__dirname, 'course-codes-mapping.json');
  
  if (!fs.existsSync(mappingPath)) {
    throw new Error(`Course mapping file not found: ${mappingPath}`);
  }

  const rawData = fs.readFileSync(mappingPath, 'utf-8');
  const mappings = JSON.parse(rawData);

  return mappings;
}

async function seedCourses(pb: PocketBase, courseMappings: Record<string, CourseData>) {
  console.log('\nSeeding courses collection...');
  
  const courses = Object.values(courseMappings);
  let successCount = 0;
  let errorCount = 0;
  let updateCount = 0;

  for (const course of courses) {
    try {
      // Check if course already exists
      const existing = await pb.collection('courses').getFullList({
        filter: `courseCode = "${course.code}"`
      });

      if (existing.length > 0) {
        // Update existing course
        await pb.collection('courses').update(existing[0].id, {
          courseCode: course.code,
          courseName: course.name,
          fullName: course.fullName,
          category: course.category,
          level: course.level,
          credits: course.credits,
          active: true
        });
        updateCount++;
        console.log(`  ↻ Updated: ${course.code} - ${course.fullName}`);
      } else {
        // Create new course
        await pb.collection('courses').create({
          courseCode: course.code,
          courseName: course.name,
          fullName: course.fullName,
          category: course.category,
          level: course.level,
          credits: course.credits,
          active: true
        });
        successCount++;
        console.log(`  ✓ Created: ${course.code} - ${course.fullName}`);
      }
    } catch (error) {
      errorCount++;
      console.error(`  ✗ Failed to process ${course.code}: ${error.message}`);
    }
  }

  console.log(`\n✓ Seeding completed!`);
  console.log(`  New courses created: ${successCount}`);
  console.log(`  Existing courses updated: ${updateCount}`);
  console.log(`  Errors: ${errorCount}`);

  return { successCount, updateCount, errorCount };
}

async function displayCourseSummary(pb: PocketBase) {
  console.log('\n' + '='.repeat(80));
  console.log('COURSE CATALOG SUMMARY');
  console.log('='.repeat(80));

  const courses = await pb.collection('courses').getFullList({
    sort: 'courseCode'
  });

  // Group by category
  const byCategory: Record<string, any[]> = {};
  
  for (const course of courses) {
    if (!byCategory[course.category]) {
      byCategory[course.category] = [];
    }
    byCategory[course.category].push(course);
  }

  // Display by category
  for (const [category, categoryCourses] of Object.entries(byCategory)) {
    console.log(`\n${category.toUpperCase()}`);
    console.log('-'.repeat(80));
    
    for (const course of categoryCourses) {
      const levelLabel = course.level < 200 ? '100-level' : course.level < 300 ? '200-level' : '300-level';
      console.log(`  ${course.courseCode.padEnd(10)} | ${course.fullName.padEnd(40)} | ${course.credits} credits | ${levelLabel}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`Total Courses: ${courses.length}`);
  console.log('='.repeat(80) + '\n');
}

async function main() {
  try {
    console.log('BMI UMS - Course Seeding');
    console.log('========================\n');

    // Load course mappings
    console.log('Loading course mappings...');
    const courseMappings = loadCourseMappings();
    console.log(`✓ Loaded ${Object.keys(courseMappings).length} course definitions`);

    // Connect to PocketBase
    const pb = getPocketBase();
    await authenticateAdmin(pb);

    // Seed courses
    const { successCount, updateCount, errorCount } = await seedCourses(pb, courseMappings);

    // Display summary
    await displayCourseSummary(pb);

    if (errorCount > 0) {
      console.log('⚠ Seeding completed with errors');
      process.exit(1);
    } else {
      console.log('✓ All courses seeded successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n✗ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();






