import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// Admin credentials
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

interface MockStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  faculty: string;
  department: string;
  careerPath: string;
  academicLevel: string;
  yearOfStudy: number;
  enrollmentDate: string;
  status: string;
  examCount: number;
}

const mockStudents: MockStudent[] = [
  // 12 exams - Theology students
  {
    id: 'bmi2024001theol',
    firstName: 'John',
    lastName: 'Kamau',
    email: 'john.kamau@student.bmi.edu',
    phone: '+254712345001',
    dateOfBirth: '2002-03-15',
    gender: 'Male',
    nationality: 'Kenyan',
    faculty: 'Theology',
    department: 'Biblical Studies',
    careerPath: 'Bachelor of Theology',
    academicLevel: 'Degree',
    yearOfStudy: 2,
    enrollmentDate: '2023-09-01',
    status: 'Active',
    examCount: 12
  },
  {
    id: 'bmi2024002theol',
    firstName: 'Mary',
    lastName: 'Wanjiku',
    email: 'mary.wanjiku@student.bmi.edu',
    phone: '+254712345002',
    dateOfBirth: '2001-07-22',
    gender: 'Female',
    nationality: 'Kenyan',
    faculty: 'Theology',
    department: 'Pastoral Studies',
    careerPath: 'Bachelor of Theology',
    academicLevel: 'Degree',
    yearOfStudy: 3,
    enrollmentDate: '2022-09-01',
    status: 'Active',
    examCount: 12
  },

  // 18 exams - ICT students
  {
    id: 'bmi2024003ictcs',
    firstName: 'David',
    lastName: 'Ochieng',
    email: 'david.ochieng@student.bmi.edu',
    phone: '+254712345003',
    dateOfBirth: '2003-01-10',
    gender: 'Male',
    nationality: 'Kenyan',
    faculty: 'ICT',
    department: 'Computer Science',
    careerPath: 'Bachelor of Computer Science',
    academicLevel: 'Degree',
    yearOfStudy: 2,
    enrollmentDate: '2023-09-01',
    status: 'Active',
    examCount: 18
  },
  {
    id: 'bmi2024004ictit',
    firstName: 'Grace',
    lastName: 'Akinyi',
    email: 'grace.akinyi@student.bmi.edu',
    phone: '+254712345004',
    dateOfBirth: '2002-11-05',
    gender: 'Female',
    nationality: 'Kenyan',
    faculty: 'ICT',
    department: 'Information Technology',
    careerPath: 'Bachelor of Information Technology',
    academicLevel: 'Degree',
    yearOfStudy: 3,
    enrollmentDate: '2022-09-01',
    status: 'Active',
    examCount: 18
  },

  // 20 exams - Business students
  {
    id: 'bmi2024005busad',
    firstName: 'Peter',
    lastName: 'Mwangi',
    email: 'peter.mwangi@student.bmi.edu',
    phone: '+254712345005',
    dateOfBirth: '2001-05-18',
    gender: 'Male',
    nationality: 'Kenyan',
    faculty: 'Business',
    department: 'Business Administration',
    careerPath: 'Bachelor of Business Administration',
    academicLevel: 'Degree',
    yearOfStudy: 4,
    enrollmentDate: '2021-09-01',
    status: 'Active',
    examCount: 20
  },
  {
    id: 'bmi2024006busac',
    firstName: 'Sarah',
    lastName: 'Njeri',
    email: 'sarah.njeri@student.bmi.edu',
    phone: '+254712345006',
    dateOfBirth: '2002-09-30',
    gender: 'Female',
    nationality: 'Kenyan',
    faculty: 'Business',
    department: 'Accounting',
    careerPath: 'Bachelor of Commerce (Accounting)',
    academicLevel: 'Degree',
    yearOfStudy: 3,
    enrollmentDate: '2022-09-01',
    status: 'Active',
    examCount: 20
  },

  // 24 exams - Education students
  {
    id: 'bmi2024007edule',
    firstName: 'James',
    lastName: 'Kipchoge',
    email: 'james.kipchoge@student.bmi.edu',
    phone: '+254712345007',
    dateOfBirth: '2000-12-08',
    gender: 'Male',
    nationality: 'Kenyan',
    faculty: 'Education',
    department: 'Educational Leadership',
    careerPath: 'Bachelor of Education',
    academicLevel: 'Degree',
    yearOfStudy: 4,
    enrollmentDate: '2021-09-01',
    status: 'Active',
    examCount: 24
  },
  {
    id: 'bmi2024008educd',
    firstName: 'Ruth',
    lastName: 'Chebet',
    email: 'ruth.chebet@student.bmi.edu',
    phone: '+254712345008',
    dateOfBirth: '2001-04-25',
    gender: 'Female',
    nationality: 'Kenyan',
    faculty: 'Education',
    department: 'Curriculum Development',
    careerPath: 'Bachelor of Education',
    academicLevel: 'Degree',
    yearOfStudy: 3,
    enrollmentDate: '2022-09-01',
    status: 'Active',
    examCount: 24
  },

  // 25 exams - Mixed faculties (final year students)
  {
    id: 'bmi2024009thesy',
    firstName: 'Daniel',
    lastName: 'Mutua',
    email: 'daniel.mutua@student.bmi.edu',
    phone: '+254712345009',
    dateOfBirth: '2000-08-14',
    gender: 'Male',
    nationality: 'Kenyan',
    faculty: 'Theology',
    department: 'Systematic Theology',
    careerPath: 'Bachelor of Theology',
    academicLevel: 'Degree',
    yearOfStudy: 4,
    enrollmentDate: '2021-09-01',
    status: 'Active',
    examCount: 25
  },
  {
    id: 'bmi2024010ictse',
    firstName: 'Faith',
    lastName: 'Wambui',
    email: 'faith.wambui@student.bmi.edu',
    phone: '+254712345010',
    dateOfBirth: '2001-02-19',
    gender: 'Female',
    nationality: 'Kenyan',
    faculty: 'ICT',
    department: 'Software Engineering',
    careerPath: 'Bachelor of Software Engineering',
    academicLevel: 'Degree',
    yearOfStudy: 4,
    enrollmentDate: '2021-09-01',
    status: 'Active',
    examCount: 25
  },
  {
    id: 'bmi2024011busmk',
    firstName: 'Michael',
    lastName: 'Otieno',
    email: 'michael.otieno@student.bmi.edu',
    phone: '+254712345011',
    dateOfBirth: '2000-06-07',
    gender: 'Male',
    nationality: 'Kenyan',
    faculty: 'Business',
    department: 'Marketing',
    careerPath: 'Bachelor of Commerce (Marketing)',
    academicLevel: 'Degree',
    yearOfStudy: 4,
    enrollmentDate: '2021-09-01',
    status: 'Active',
    examCount: 25
  },
  {
    id: 'bmi2024012eduec',
    firstName: 'Elizabeth',
    lastName: 'Nyambura',
    email: 'elizabeth.nyambura@student.bmi.edu',
    phone: '+254712345012',
    dateOfBirth: '2001-10-12',
    gender: 'Female',
    nationality: 'Kenyan',
    faculty: 'Education',
    department: 'Early Childhood Education',
    careerPath: 'Bachelor of Education (ECE)',
    academicLevel: 'Degree',
    yearOfStudy: 4,
    enrollmentDate: '2021-09-01',
    status: 'Active',
    examCount: 25
  }
];

// Course codes for each faculty
const courseCodes = {
  Theology: [
    'THE-101', 'THE-102', 'THE-103', 'THE-104', 'THE-105',
    'THE-201', 'THE-202', 'THE-203', 'THE-204', 'THE-205',
    'THE-301', 'THE-302', 'THE-303', 'THE-304', 'THE-305',
    'THE-401', 'THE-402', 'THE-403', 'THE-404', 'THE-405',
    'GEN-101', 'GEN-102', 'GEN-103', 'GEN-104', 'GEN-105'
  ],
  ICT: [
    'ICT-101', 'ICT-102', 'ICT-103', 'ICT-104', 'ICT-105',
    'ICT-201', 'ICT-202', 'ICT-203', 'ICT-204', 'ICT-205',
    'ICT-301', 'ICT-302', 'ICT-303', 'ICT-304', 'ICT-305',
    'ICT-401', 'ICT-402', 'ICT-403', 'ICT-404', 'ICT-405',
    'GEN-101', 'GEN-102', 'GEN-103', 'GEN-104', 'GEN-105'
  ],
  Business: [
    'BUS-101', 'BUS-102', 'BUS-103', 'BUS-104', 'BUS-105',
    'BUS-201', 'BUS-202', 'BUS-203', 'BUS-204', 'BUS-205',
    'BUS-301', 'BUS-302', 'BUS-303', 'BUS-304', 'BUS-305',
    'BUS-401', 'BUS-402', 'BUS-403', 'BUS-404', 'BUS-405',
    'GEN-101', 'GEN-102', 'GEN-103', 'GEN-104', 'GEN-105'
  ],
  Education: [
    'EDU-101', 'EDU-102', 'EDU-103', 'EDU-104', 'EDU-105',
    'EDU-201', 'EDU-202', 'EDU-203', 'EDU-204', 'EDU-205',
    'EDU-301', 'EDU-302', 'EDU-303', 'EDU-304', 'EDU-305',
    'EDU-401', 'EDU-402', 'EDU-403', 'EDU-404', 'EDU-405',
    'GEN-101', 'GEN-102', 'GEN-103', 'GEN-104', 'GEN-105'
  ]
};

const terms = ['Fall 2022', 'Spring 2023', 'Fall 2023', 'Spring 2024'];

async function addMockStudents() {
  try {
    console.log('🔐 Authenticating as admin...');
    // Use direct HTTP call for PocketBase 0.22+ admin auth
    const authResponse = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    
    if (!authResponse.ok) {
      const err = await authResponse.json();
      throw new Error(`Admin auth failed: ${err.message || authResponse.statusText}`);
    }
    
    const authData = await authResponse.json();
    pb.authStore.save(authData.token, authData.admin);
    console.log('✅ Authenticated successfully\n');

    for (const student of mockStudents) {
      try {
        console.log(`📝 Adding student: ${student.firstName} ${student.lastName} (${student.id})`);
        console.log(`   Faculty: ${student.faculty}, Exams: ${student.examCount}`);

        // Create student record
        const studentRecord = await pb.collection('students').create({
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          phone: student.phone,
          gender: student.gender,
          nationality: student.nationality,
          faculty: student.faculty,
          department: student.department,
          careerPath: student.careerPath,
          academicLevel: student.academicLevel,
          admissionYear: student.enrollmentDate.split('-')[0],
          enrollmentTerm: 'Fall',
          status: student.status,
          standing: 'Good',
          gpa: 3.5,
          avatarColor: 'bg-purple-600',
          photoZoom: 1,
          photoPosition: { x: 0, y: 0 }
        });

        console.log(`   ✅ Created student: ${student.firstName} ${student.lastName}\n`);

      } catch (error: any) {
        if (error.status === 400 && error.data?.id) {
          console.log(`   ⚠️  Student ${student.id} already exists, skipping...\n`);
        } else {
          console.error(`   ❌ Error adding student ${student.id}:`, error.message);
          console.error(`   📋 Error details:`, JSON.stringify(error.data, null, 2));
          console.error(`   📋 Full error:`, error);
        }
      }
    }

    console.log('\n🎉 Mock student data added successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Total students: ${mockStudents.length}`);
    console.log(`   - 12 exams: 2 students (Theology)`);
    console.log(`   - 18 exams: 2 students (ICT)`);
    console.log(`   - 20 exams: 2 students (Business)`);
    console.log(`   - 24 exams: 2 students (Education)`);
    console.log(`   - 25 exams: 4 students (Mixed faculties)`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addMockStudents();
