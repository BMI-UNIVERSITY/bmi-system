import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Student } from '../../types';
import { apiClient } from './apiClient';
import { queryKeys } from './queryKeys';

export function useStudents() {
  return useQuery({
    queryKey: queryKeys.students.all(),
    queryFn: () => apiClient.get<Student[]>('/api/students'),
    staleTime: 1000 * 60 * 2,
    retry: 2,
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: queryKeys.students.detail(id),
    queryFn: () => apiClient.get<Student>(`/api/students/${id}`),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Student, 'id' | 'internalSeq' | 'studentUid' | 'registrationNumber' | 'studentNumber'>) =>
      apiClient.post<Student>('/api/students', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all() });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) =>
      apiClient.put<Student>(`/api/students/${id}`, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.students.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all() });
    },
  });
}

export function useToggleStudentHold() {
  const updateStudent = useUpdateStudent();

  return useMutation({
    mutationFn: ({
      studentId,
      holdType,
      value,
    }: {
      studentId: string;
      holdType: 'financial' | 'academic';
      value: boolean;
    }) => {
      const field = holdType === 'financial' ? 'financialHold' : 'academicHold';
      return updateStudent.mutateAsync({ id: studentId, data: { [field]: value } });
    },
  });
}

export function useUpdateStudentGrade() {
  const updateStudent = useUpdateStudent();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      studentId,
      gpa,
      cgpa,
    }: {
      studentId: string;
      gpa: number;
      cgpa: number;
    }) => updateStudent.mutateAsync({ id: studentId, data: { gpa, cgpa } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all() });
    },
  });
}

export function useGraduateStudent() {
  const updateStudent = useUpdateStudent();

  return useMutation({
    mutationFn: (studentId: string) =>
      updateStudent.mutateAsync({ id: studentId, data: { academicStatus: 'Graduated' } }),
  });
}
