export { apiClient, ApiError } from './apiClient';
export { queryKeys } from './queryKeys';

export {
  useStudents,
  useStudent,
  useCreateStudent,
  useUpdateStudent,
  useToggleStudentHold,
  useUpdateStudentGrade,
  useGraduateStudent,
} from './useStudents';

export {
  useApplications,
  useAddApplication,
  useUpdateApplicationStatus,
  useUpdateApplicationDocStatus,
  useConvertApplicationToStudent,
  useRunAutomatedPipeline,
} from './useApplications';

export {
  useCourses,
  useAddCourse,
  useUpdateCourse,
  useDeleteCourse,
  useEnrollStudentInCourse,
  useDropStudentFromCourse,
} from './useCourses';

export {
  useInvoices,
  useStudentInvoices,
  useCreateInvoice,
  useProcessPayment,
  useApplyScholarship,
} from './useInvoices';

export {
  useStaff,
  useAddStaff,
  useUpdateStaff,
} from './useStaff';

export {
  useBooks,
  useLoans,
  useStudentLoans,
  useAddBook,
  useCheckoutBook,
  useReturnBook,
} from './useLibrary';

export {
  useAuditLogs,
  useLogAudit,
} from './useAuditLogs';
