import { create } from 'zustand';
import { StudentCourseEnrollment, AdvisingNote } from '../types';
import { INITIAL_ENROLLMENTS, INITIAL_ADVISING_NOTES } from '../data/mockData';

interface AcademicState {
  enrollments: StudentCourseEnrollment[];
  advisingNotes: AdvisingNote[];
  enrollStudentInCourse: (studentId: string, courseId: string) => { success: boolean, message: string };
  dropStudentFromCourse: (studentId: string, courseId: string) => { success: boolean, message: string };
  updateStudentGrade: (studentId: string, courseId: string, grade: string, numericScore: number) => void;
  recordAttendance: (studentId: string, courseId: string, status: 'Present' | 'Absent' | 'Late') => void;
  addAdvisingNote: (note: Omit<AdvisingNote, 'id' | 'date'>) => void;
  resolveAdvisingNote: (noteId: string) => void;
  setEnrollments: (e: StudentCourseEnrollment[]) => void;
}

export const useAcademicStore = create<AcademicState>((set) => {
  const savedE = localStorage.getItem('bmi_ums_v4_enrollments');
  const savedA = localStorage.getItem('bmi_ums_v4_advising');
  
  return {
    enrollments: savedE ? JSON.parse(savedE) : INITIAL_ENROLLMENTS,
    advisingNotes: savedA ? JSON.parse(savedA) : INITIAL_ADVISING_NOTES,
    
    setEnrollments: (e) => {
      localStorage.setItem('bmi_ums_v4_enrollments', JSON.stringify(e));
      set({ enrollments: e });
    },
    
    enrollStudentInCourse: (studentId, courseId) => {
      let result = { success: false, message: '' };
      set(state => {
        // Quick check to simulate rules
        if (state.enrollments.some(e => e.studentId === studentId && e.courseId === courseId)) {
          result = { success: false, message: 'Already enrolled in this course.' };
          return state;
        }
        
        const newE = [...state.enrollments, { studentId, courseId, semester: 'Fall 2026', status: 'Enrolled', attendancePercentage: 100 } as StudentCourseEnrollment];
        localStorage.setItem('bmi_ums_v4_enrollments', JSON.stringify(newE));
        result = { success: true, message: 'Successfully enrolled.' };
        return { enrollments: newE };
      });
      return result;
    },
    dropStudentFromCourse: (studentId, courseId) => {
      let result = { success: true, message: 'Course dropped successfully.' };
      set(state => {
        const newE = state.enrollments.filter(e => !(e.studentId === studentId && e.courseId === courseId));
        localStorage.setItem('bmi_ums_v4_enrollments', JSON.stringify(newE));
        return { enrollments: newE };
      });
      return result;
    },
    updateStudentGrade: (studentId, courseId, grade, numericScore) => set(state => {
      const newE = state.enrollments.map(e => (e.studentId === studentId && e.courseId === courseId) ? { ...e, grade, numericScore } : e);
      localStorage.setItem('bmi_ums_v4_enrollments', JSON.stringify(newE));
      return { enrollments: newE };
    }),
    recordAttendance: (studentId, courseId, status) => set(state => {
      return state; // Placeholder for full implementation
    }),
    addAdvisingNote: (note) => set(state => {
      const newA = [{ ...note, id: 'adv-' + Date.now(), date: new Date().toISOString().split('T')[0] }, ...state.advisingNotes];
      localStorage.setItem('bmi_ums_v4_advising', JSON.stringify(newA));
      return { advisingNotes: newA };
    }),
    resolveAdvisingNote: (noteId) => set(state => {
      const newA = state.advisingNotes.map(n => n.id === noteId ? { ...n, status: 'Resolved' as const } : n);
      localStorage.setItem('bmi_ums_v4_advising', JSON.stringify(newA));
      return { advisingNotes: newA };
    })
  };
});
