export interface Student {
  id: string;
  student_code: string;
  reg_no?: string;
  full_name: string;
  first_name: string;
  last_name: string;
  gender: "Male" | "Female";
  date_of_birth?: string;
  nationality?: string;
  email: string;
  phone: string;
  admission_no?: string;
  admission_date: string;
  programme: string;
  program_code?: string;
  status: "Active" | "Inactive" | "Graduated" | "Suspended" | "Applicant";
  avatar_color: string;
  photo?: string;
  photo_zoom: number;
  photo_position?: { x: number; y: number };
  study_center_id?: string;
  campus_name?: string;
  expand?: {
    study_center_id?: { name: string; location?: string };
  };
  academicLevel?: string;
  faculty?: string;
  department?: string;
  gpa?: number;
  admissionYear?: string;
  student_number?: string;
  careerPath?: string;
  year_of_study?: string;
  graduation_date?: string;
  degree_level?: string;
  award_type?: string;
  mode_of_study?: string;
  created?: string;
  updated?: string;
}

export interface StudentCreateInput {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  programme: string;
  yearOfStudy: number;
}
