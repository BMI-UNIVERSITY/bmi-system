/**
 * BMI UMS - Export Data Script
 * Exports all student and exam data from PocketBase to JSON files
 */

import { getPocketBase } from '../src/services/pocketbase.js';
import * as fs from 'fs';
import * as path from 'path';

const EXPORT_DIR = path.join(process.cwd(), 'exports');

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function exportStudents() {
  console.log('Exporting students...');
  const pb = getPocketBase();
  
  try {
    const records = await pb.collection('students').getFullList({
      sort: '-created',
    });
    
    const filePath = path.join(EXPORT_DIR, 'students.json');
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
    
    console.log(`✓ Exported ${records.length} students to ${filePath}`);
    return records.length;
  } catch (err: any) {
    console.error('✗ Failed to export students:', err.message);
    return 0;
  }
}

async function exportCourses() {
  console.log('Exporting courses...');
  const pb = getPocketBase();
  
  try {
    const records = await pb.collection('courses').getFullList({
      sort: '-created',
    });
    
    const filePath = path.join(EXPORT_DIR, 'courses.json');
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
    
    console.log(`✓ Exported ${records.length} courses to ${filePath}`);
    return records.length;
  } catch (err: any) {
    console.error('✗ Failed to export courses:', err.message);
    return 0;
  }
}

async function exportExamCollections() {
  console.log('Exporting exam collections...');
  const pb = getPocketBase();
  
  try {
    const collections = await pb.collections.getFullList();
    const examCollections = collections.filter(c => c.name.startsWith('exams_'));
    
    let totalExams = 0;
    
    for (const collection of examCollections) {
      try {
        const records = await pb.collection(collection.name).getFullList({
          sort: '-created',
        });
        
        const filePath = path.join(EXPORT_DIR, `${collection.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
        
        console.log(`✓ Exported ${records.length} records from ${collection.name}`);
        totalExams += records.length;
      } catch (err: any) {
        console.error(`✗ Failed to export ${collection.name}:`, err.message);
      }
    }
    
    console.log(`✓ Total exam records exported: ${totalExams}`);
    return totalExams;
  } catch (err: any) {
    console.error('✗ Failed to export exam collections:', err.message);
    return 0;
  }
}

async function exportCertificates() {
  console.log('Exporting certificates...');
  const pb = getPocketBase();
  
  try {
    const records = await pb.collection('certificates').getFullList({
      sort: '-created',
    });
    
    const filePath = path.join(EXPORT_DIR, 'certificates.json');
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
    
    console.log(`✓ Exported ${records.length} certificates to ${filePath}`);
    return records.length;
  } catch (err: any) {
    console.error('✗ Failed to export certificates:', err.message);
    return 0;
  }
}

async function main() {
  console.log('BMI UMS Data Export Tool');
  console.log('========================\n');
  
  await ensureDir(EXPORT_DIR);
  
  const students = await exportStudents();
  const courses = await exportCourses();
  const exams = await exportExamCollections();
  const certificates = await exportCertificates();
  
  console.log('\n========================');
  console.log('Export Summary:');
  console.log(`  Students: ${students}`);
  console.log(`  Courses: ${courses}`);
  console.log(`  Exam Records: ${exams}`);
  console.log(`  Certificates: ${certificates}`);
  console.log(`\nFiles saved to: ${EXPORT_DIR}`);
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
