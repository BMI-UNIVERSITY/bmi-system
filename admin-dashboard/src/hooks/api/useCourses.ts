import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Course, Student } from '../../types';
import { apiClient } from './apiClient';
import { queryKeys } from './queryKeys';

export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses.all(),
    queryFn: () => apiClient.get<Course[]>('/api/courses'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Course, 'id' | 'enrolledCount'>) =>
      apiClient.post<Course>('/api/courses', data),
    onMutate: async (newCourse) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.courses.all() });
      const previousCourses = queryClient.getQueryData<Course[]>(queryKeys.courses.all());

      queryClient.setQueryData<Course[]>(queryKeys.courses.all(), (old) => [
        ...(old ?? []),
        { ...newCourse, id: `temp-${Date.now()}`, enrolledCount: 0 },
      ]);

      return { previousCourses };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCourses) {
        queryClient.setQueryData(queryKeys.courses.all(), context.previousCourses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Course> }) =>
      apiClient.put<Course>(`/api/courses/${id}`, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.courses.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) =>
      apiClient.delete<void>(`/api/courses/${courseId}`),
    onMutate: async (courseId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.courses.all() });
      const previousCourses = queryClient.getQueryData<Course[]>(queryKeys.courses.all());
      queryClient.setQueryData<Course[]>(queryKeys.courses.all(), (old) =>
        old?.filter((c) => c.id !== courseId)
      );
      return { previousCourses };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCourses) {
        queryClient.setQueryData(queryKeys.courses.all(), context.previousCourses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() });
    },
  });
}

export function useEnrollStudentInCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ student, course }: { student: Student; course: Course }) => {
      if (course.enrolledCount >= course.capacity) {
        throw new Error(`Course ${course.code} is at full capacity (${course.capacity})`);
      }

      return apiClient.put<Course>(`/api/courses/${course.id}`, {
        enrolledCount: course.enrolledCount + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all() });
    },
  });
}

export function useDropStudentFromCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ course }: { studentId: string; course: Course }) =>
      apiClient.put<Course>(`/api/courses/${course.id}`, {
        enrolledCount: Math.max(0, course.enrolledCount - 1),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all() });
    },
  });
}
