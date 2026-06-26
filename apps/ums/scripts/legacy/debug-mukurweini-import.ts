import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const pb = new PocketBase('http://127.0.0.1:8090');

async function main() {
  // Auth
  await pb.collection('users').authWithPassword('admin@bmi.edu', 'BMIAdmin2024Secure');
  
  // Read CSV
  const csvPath = path.join(process.cwd(), 'CSV FILES', 'DIPLOMA MUKURWEINI Class Final GRADES  - Sheet2 (5).csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  console.log('📄 CSV Headers (column names):');
  console.log(Object.keys(records[0]));
  console.log('\n');
  
  // Get all students
  const students = await pb.collection('students').getFullList();
  console.log('👥 Students in database:');
  students.forEach((s: any) => {
    console.log(`   ${s.admission_no} - ${s.full_name}`);
  });
  console.log('\n');
  
  // Check Martin specifically
  console.log('🔍 Looking for Martin Njoroge Ndung\'u in CSV headers:');
  const headers = Object.keys(records[0]);
  const martinHeaders = headers.filter(h => 
    h.toLowerCase().includes('martin') && 
    h.toLowerCase().includes('njoroge')
  );
  
  console.log('Found headers:', martinHeaders);
  console.log('\n');
  
  if (martinHeaders.length > 0) {
    const martinHeader = martinHeaders[0];
    console.log(`✅ Martin's column name: "${martinHeader}"`);
    console.log(`   Normalized: "${martinHeader.toLowerCase().trim()}"`);
    
    // Check first few grades
    console.log('\n📊 Sample grades for Martin:');
    records.slice(0, 5).forEach((row: any) => {
      console.log(`   ${row['course name']}: ${row[martinHeader]}`);
    });
  }
  
  // Check name matching logic
  console.log('\n🔍 Testing name matching logic:');
  const martin = students.find((s: any) => s.admission_no === 'KEN-DP 225-538');
  if (martin) {
    console.log(`   Database name: "${martin.full_name}"`);
    console.log(`   Normalized: "${martin.full_name.toLowerCase().trim()}"`);
    
    if (martinHeaders.length > 0) {
      const csvName = martinHeaders[0].toLowerCase().trim();
      const dbName = martin.full_name.toLowerCase().trim();
      
      console.log(`\n   CSV includes DB? ${csvName.includes(dbName)}`);
      console.log(`   DB includes CSV? ${dbName.includes(csvName)}`);
      
      // Try partial matching
      const csvParts = csvName.split(' ').filter(p => p.length > 2);
      const dbParts = dbName.split(' ').filter(p => p.length > 2);
      
      console.log(`   CSV parts: ${csvParts.join(', ')}`);
      console.log(`   DB parts: ${dbParts.join(', ')}`);
      
      const matches = csvParts.filter(cp => dbParts.some(dp => dp.includes(cp) || cp.includes(dp)));
      console.log(`   Matching parts: ${matches.join(', ')}`);
    }
  }
}

main().catch (error);






