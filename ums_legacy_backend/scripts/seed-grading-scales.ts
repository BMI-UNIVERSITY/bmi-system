/**
 * BMI UMS - Seed Default Grading Scales
 * Creates default US 4.0, ECTS, and Percentage grading scales
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bmi.edu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';

const pb = new PocketBase(POCKETBASE_URL);

// US 4.0 Grading Scale
const US_4_0_SCALE = {
  type: 'US_4_0',
  name: 'US 4.0 Scale',
  description: 'Standard US university grading scale with letter grades and grade points',
  boundaries: [
    { grade: 'A+', minScore: 97, maxScore: 100, gradePoints: 4.0, isPassing: true },
    { grade: 'A', minScore: 93, maxScore: 96.99, gradePoints: 4.0, isPassing: true },
    { grade: 'A-', minScore: 90, maxScore: 92.99, gradePoints: 3.7, isPassing: true },
    { grade: 'B+', minScore: 87, maxScore: 89.99, gradePoints: 3.3, isPassing: true },
    { grade: 'B', minScore: 83, maxScore: 86.99, gradePoints: 3.0, isPassing: true },
    { grade: 'B-', minScore: 80, maxScore: 82.99, gradePoints: 2.7, isPassing: true },
    { grade: 'C+', minScore: 77, maxScore: 79.99, gradePoints: 2.3, isPassing: true },
    { grade: 'C', minScore: 73, maxScore: 76.99, gradePoints: 2.0, isPassing: true },
    { grade: 'C-', minScore: 70, maxScore: 72.99, gradePoints: 1.7, isPassing: true },
    { grade: 'D+', minScore: 67, maxScore: 69.99, gradePoints: 1.3, isPassing: true },
    { grade: 'D', minScore: 60, maxScore: 66.99, gradePoints: 1.0, isPassing: true },
    { grade: 'F', minScore: 0, maxScore: 59.99, gradePoints: 0.0, isPassing: false },
  ],
  gradePointMap: {
    'A+': 4.0,
    'A': 4.0,
    'A-': 3.7,
    'B+': 3.3,
    'B': 3.0,
    'B-': 2.7,
    'C+': 2.3,
    'C': 2.0,
    'C-': 1.7,
    'D+': 1.3,
    'D': 1.0,
    'F': 0.0,
  },
  isActive: true,
};

// ECTS Grading Scale
const ECTS_SCALE = {
  type: 'ECTS',
  name: 'ECTS Scale',
  description: 'European Credit Transfer and Accumulation System grading scale',
  boundaries: [
    { grade: 'A', minScore: 90, maxScore: 100, gradePoints: 4.0, isPassing: true },
    { grade: 'B', minScore: 80, maxScore: 89.99, gradePoints: 3.0, isPassing: true },
    { grade: 'C', minScore: 70, maxScore: 79.99, gradePoints: 2.0, isPassing: true },
    { grade: 'D', minScore: 60, maxScore: 69.99, gradePoints: 1.0, isPassing: true },
    { grade: 'E', minScore: 50, maxScore: 59.99, gradePoints: 0.5, isPassing: true },
    { grade: 'F', minScore: 0, maxScore: 49.99, gradePoints: 0.0, isPassing: false },
  ],
  gradePointMap: {
    'A': 4.0,
    'B': 3.0,
    'C': 2.0,
    'D': 1.0,
    'E': 0.5,
    'F': 0.0,
  },
  isActive: true,
};

// Percentage Grading Scale
const PERCENTAGE_SCALE = {
  type: 'PERCENTAGE',
  name: 'Percentage Scale',
  description: 'Direct percentage-based grading (0-100)',
  boundaries: [
    { grade: '100', minScore: 100, maxScore: 100, gradePoints: 4.0, isPassing: true },
    { grade: '90-99', minScore: 90, maxScore: 99.99, gradePoints: 3.6, isPassing: true },
    { grade: '80-89', minScore: 80, maxScore: 89.99, gradePoints: 3.0, isPassing: true },
    { grade: '70-79', minScore: 70, maxScore: 79.99, gradePoints: 2.0, isPassing: true },
    { grade: '60-69', minScore: 60, maxScore: 69.99, gradePoints: 1.0, isPassing: true },
    { grade: '0-59', minScore: 0, maxScore: 59.99, gradePoints: 0.0, isPassing: false },
  ],
  gradePointMap: {},
  isActive: true,
};

async function seedGradingScales() {
  try {
    console.log('Connecting to PocketBase...');
    
    // Authenticate as admin
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✓ Authenticated as admin');

    // Check if grading_scales collection exists
    try {
      await pb.collection('grading_scales').getList(1, 1);
    } catch (error) {
      console.error('✗ grading_scales collection does not exist. Please run migrations first.');
      process.exit(1);
    }

    // Seed US 4.0 Scale
    try {
      const existing = await pb.collection('grading_scales').getFirstListItem('type="US_4_0"');
      console.log('US 4.0 scale already exists, skipping...');
    } catch {
      await pb.collection('grading_scales').create(US_4_0_SCALE);
      console.log('✓ Created US 4.0 grading scale');
    }

    // Seed ECTS Scale
    try {
      const existing = await pb.collection('grading_scales').getFirstListItem('type="ECTS"');
      console.log('ECTS scale already exists, skipping...');
    } catch {
      await pb.collection('grading_scales').create(ECTS_SCALE);
      console.log('✓ Created ECTS grading scale');
    }

    // Seed Percentage Scale
    try {
      const existing = await pb.collection('grading_scales').getFirstListItem('type="PERCENTAGE"');
      console.log('Percentage scale already exists, skipping...');
    } catch {
      await pb.collection('grading_scales').create(PERCENTAGE_SCALE);
      console.log('✓ Created Percentage grading scale');
    }

    console.log('\n✓ Grading scales seeded successfully!');
    process.exit(0);

  } catch (error) {
    console.error('✗ Error seeding grading scales:', error);
    process.exit(1);
  }
}

seedGradingScales();
