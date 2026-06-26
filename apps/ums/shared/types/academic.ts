export type ProgramLevel = 'certificate' | 'diploma' | 'bachelor' | 'master' | 'doctorate';

export type StudyMode = 'full_time' | 'part_time' | 'distance' | 'hybrid';

export interface Faculty {
  id: string;
  code: string;
  name: string;
  short_name: string;
  dean_id?: string;
  email?: string;
  description: string;
  is_active: boolean;
  created: string;
  updated: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  faculty_id: string;
  head_id?: string;
  email?: string;
  description: string;
  is_active: boolean;
  created: string;
  updated: string;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  abbreviation: string;
  degree_type: string;
  level: ProgramLevel;
  faculty_id: string;
  department_id: string;
  duration_years: number;
  total_credit_hours: number;
  total_semesters: number;
  mode_of_study: StudyMode;
  accreditation_body: string;
  entry_requirements: string;
  description: string;
  is_active: boolean;
  created: string;
  updated: string;
}

export interface AcademicTerm {
  id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  academic_year: string;
  semester_number: number;
  status: 'upcoming' | 'registration' | 'active' | 'exam' | 'grading' | 'closed';
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  term_id: string;
  status: 'enrolled' | 'dropped' | 'completed' | 'failed' | 'incomplete';
  grade?: string;
  score?: number;
}
