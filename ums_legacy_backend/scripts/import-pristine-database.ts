import fs from 'fs';
import path from 'path';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

// Load .env relative to script
const rootDir = fs.existsSync(path.resolve(process.cwd(), './backend'))
    ? path.resolve(process.cwd(), './backend')
    : process.cwd();
dotenv.config({ path: path.join(rootDir, '.env') });

const pb = new PocketBase('http://127.0.0.1:8090');
pb.autoCancellation(false);

const DB_DIR = fs.existsSync(path.resolve(process.cwd(), './DATABASE'))
    ? path.resolve(process.cwd(), './DATABASE')
    : path.resolve(process.cwd(), '../DATABASE');

// Helper to parse CSV
function parseCSV(filename: string) {
    const filePath = path.join(DB_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        const obj: any = {};
        headers.forEach((h, i) => {
            obj[h] = values[i] || '';
        });
        return obj;
    });
}

async function authAdmin() {
    const response = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'admin@bmi.edu', password: (process.env.POCKETBASE_ADMIN_PASSWORD ?? '') })
    });
    
    if (!response.ok) {
        throw new Error(`Auth failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    pb.authStore.save(data.token, data.admin);
    return data.token;
}

async function syncCollections(token: string) {
    console.log('🔄 Recreating collections for Pristine schema...');

    const collectionsToCreate = ['campuses', 'modules', 'courses', 'students', 'academic_records', 'staff'];
    const collectionsToDelete = [
        'academic_records', 'grades', 'enrollments', 'certificates', 
        'program_courses', 'students', 'staff', 'courses', 'programs', 
        'departments', 'faculties', 'modules', 'campuses'
    ];
    const existingCollections = await pb.collections.getFullList();
    
    // Phase 1: Delete existing to ensure clean schema
    for (const name of collectionsToDelete) {
        const existing = existingCollections.find(c => c.name === name);
        if (existing) {
            console.log(`Deleting collection: ${name}...`);
            try {
                await pb.collections.delete(existing.id);
            } catch (e) {
                console.warn(`Failed to delete ${name} (might have dependencies): ${e}`);
            }
        }
    }

    // Refresh collection list
    let allCollections = await pb.collections.getFullList();
    const getCollId = (name: string) => allCollections.find(c => c.name === name)?.id;

    // Phase 2: Create placeholders
    for (const name of collectionsToCreate) {
        console.log(`Creating collection placeholder: ${name}...`);
        await pb.collections.create({ 
            name, 
            type: 'base', 
            schema: [{name: 'temp', type: 'text'}],
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
            deleteRule: ""
        });
    }

    // Refresh again to get IDs for relations
    allCollections = await pb.collections.getFullList();

    // Phase 3: Define and apply real schemas
    const collectionDefs = [
        {
            name: 'campuses',
            schema: [
                { name: 'name', type: 'text', required: true },
                { name: 'location', type: 'text' }
            ]
        },
        {
            name: 'modules',
            schema: [
                { name: 'name', type: 'text', required: true },
                { name: 'semester', type: 'select', options: { values: ['Semester 1', 'Semester 2'], maxSelect: 1 } },
                { name: 'sort_order', type: 'number' }
            ]
        },
        {
            name: 'courses',
            schema: [
                { name: 'code', type: 'text', required: true },
                { name: 'title', type: 'text', required: true },
                { name: 'category', type: 'text' },
                { name: 'credit_hours', type: 'number' },
                { name: 'module_id', type: 'relation', options: { collectionId: getCollId('modules'), maxSelect: 1 } }
            ]
        },
        {
            name: 'students',
            schema: [
                { name: 'student_code', type: 'text', required: true },
                { name: 'reg_no', type: 'text' },
                { name: 'full_name', type: 'text', required: true },
                { name: 'first_name', type: 'text' },
                { name: 'last_name', type: 'text' },
                { name: 'gender', type: 'select', options: { values: ['Male', 'Female'], maxSelect: 1 } },
                { name: 'date_of_birth', type: 'date' },
                { name: 'nationality', type: 'text' },
                { name: 'phone', type: 'text' },
                { name: 'email', type: 'email' },
                { name: 'admission_no', type: 'text' },
                { name: 'admission_date', type: 'date' },
                { name: 'programme', type: 'select', options: { values: ['Diploma in Christian Ministry and Theology'], maxSelect: 1 } },
                { name: 'status', type: 'select', options: { values: ['Active', 'Inactive', 'Graduated', 'Suspended'], maxSelect: 1 } },
                { name: 'campus_id', type: 'relation', options: { collectionId: getCollId('campuses'), maxSelect: 1 } }
            ]
        },
        {
            name: 'academic_records',
            schema: [
                { name: 'student_id', type: 'relation', required: true, options: { collectionId: getCollId('students'), maxSelect: 1 } },
                { name: 'course_id', type: 'relation', required: true, options: { collectionId: getCollId('courses'), maxSelect: 1 } },
                { name: 'total_score', type: 'number' },
                { name: 'ca_score', type: 'number' },
                { name: 'exam_score', type: 'number' },
                { name: 'grade', type: 'text' },
                { name: 'grade_point', type: 'number' },
                { name: 'remarks', type: 'text' },
                { name: 'academic_year', type: 'text' },
                { name: 'semester', type: 'text' }
            ]
        },
        {
            name: 'staff',
            schema: [
                { name: 'staff_number', type: 'text', required: true },
                { name: 'first_name', type: 'text', required: true },
                { name: 'last_name', type: 'text', required: true },
                { name: 'email', type: 'email' },
                { name: 'phone', type: 'text' },
                { name: 'role', type: 'text', required: true },
                { name: 'category', type: 'select', options: { values: ['Academic', 'Administrative', 'Management'], maxSelect: 1 } },
                { name: 'status', type: 'select', options: { values: ['Full-time', 'Part-time', 'On Leave'], maxSelect: 1 } },
                { name: 'campus_id', type: 'relation', options: { collectionId: getCollId('campuses'), maxSelect: 1 } }
            ]
        }
    ];

    for (const collDef of collectionDefs) {
        const existing = allCollections.find(c => c.name === collDef.name);
        console.log(`Updating collection schema: ${collDef.name}...`);
        await pb.collections.update(existing!.id, {
            ...existing,
            schema: collDef.schema,
        });
    }
}

async function wipeData() {
    console.log('🗑 Wiping existing data for clean import...');
    const collections = ['academic_records', 'grades', 'enrollments', 'students', 'courses', 'modules', 'campuses', 'staff'];
    for (const coll of collections) {
        try {
            const records = await pb.collection(coll).getFullList({ requestKey: null });
            console.log(`Deleting ${records.length} from ${coll}...`);
            for (const r of records) {
                await pb.collection(coll).delete(r.id, { requestKey: null });
            }
        } catch (e) {
            // Collection might not exist
        }
    }
}

async function run() {
    try {
        const token = await authAdmin();
        await syncCollections(token);
        await wipeData();

        console.log('\n🚀 Starting Pristine Import...');

        // 1. Campuses
        const campusesCSV = parseCSV('1_campuses.csv');
        const campusMap = new Map<string, string>();
        for (const c of campusesCSV) {
            const record = await pb.collection('campuses').create({
                name: c.name,
                location: c.location
            });
            campusMap.set(c.name, record.id);
        }
        console.log(`✅ Imported ${campusesCSV.length} campuses`);

        // 2. Modules
        const modulesCSV = parseCSV('2_modules.csv');
        const moduleMap = new Map<string, string>();
        for (const m of modulesCSV) {
            const record = await pb.collection('modules').create({
                name: m.name,
                semester: m.semester,
                sort_order: parseInt(m.sort_order) || 0
            });
            moduleMap.set(m.name, record.id);
        }
        console.log(`✅ Imported ${modulesCSV.length} modules`);

        // 3. Courses
        const coursesCSV = parseCSV('3_courses.csv');
        const courseMap = new Map<string, string>();
        for (const c of coursesCSV) {
            const record = await pb.collection('courses').create({
                code: c.code,
                title: c.title,
                category: c.category,
                credit_hours: parseFloat(c.credit_hours) || 0,
                module_id: moduleMap.get(c.module_name) || ''
            });
            courseMap.set(c.code, record.id);
        }
        console.log(`✅ Imported ${coursesCSV.length} courses`);

        // 4. Students
        const studentsCSV = parseCSV('4_students.csv');
        const studentMap = new Map<string, string>();
        for (const s of studentsCSV) {
            const nameParts = s.full_name.split(' ');
            const firstName = nameParts[0] || 'Student';
            const lastName = nameParts.slice(1).join(' ') || '';

            const record = await pb.collection('students').create({
                student_code: s.student_code,
                reg_no: s.reg_no,
                full_name: s.full_name,
                first_name: firstName,
                last_name: lastName,
                gender: s.gender,
                date_of_birth: s.date_of_birth ? new Date(s.date_of_birth).toISOString() : null,
                nationality: s.nationality,
                phone: s.phone,
                email: s.email || `${s.student_code.toLowerCase()}@student.bmi.edu`,
                admission_no: s.admission_no,
                admission_date: s.admission_date ? new Date(s.admission_date).toISOString() : null,
                programme: s.programme,
                status: s.status,
                campus_id: campusMap.get(s.campus_name) || ''
            });
            studentMap.set(s.student_code, record.id);
        }
        console.log(`✅ Imported ${studentsCSV.length} students`);

        // 5. Academic Records
        const recordsCSV = parseCSV('5_academic_records.csv');
        let recordsCount = 0;
        for (const r of recordsCSV) {
            const sId = studentMap.get(r.student_code);
            const cId = courseMap.get(r.course_code);
            if (!sId || !cId) continue;

            await pb.collection('academic_records').create({
                student_id: sId,
                course_id: cId,
                total_score: parseFloat(r.total_score) || 0,
                ca_score: parseFloat(r.ca_score) || 0,
                exam_score: parseFloat(r.exam_score) || 0,
                grade: r.grade,
                grade_point: parseFloat(r.grade_point) || 0,
                remarks: r.remarks,
                academic_year: r.academic_year
            });
            recordsCount++;
        }
        console.log(`✅ Imported ${recordsCount} academic records`);

        console.log('\n✨ DATA IMPORT COMPLETED SUCCESSFULLY!');

    } catch (e) {
        console.error('❌ Error during import:', e);
    }
}

run();
