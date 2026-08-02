import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StaffRecord } from '../../types';
import { apiClient } from './apiClient';
import { queryKeys } from './queryKeys';

export function useStaff() {
  return useQuery({
    queryKey: queryKeys.staff.all(),
    queryFn: () => apiClient.get<StaffRecord[]>('/api/staff'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<StaffRecord, 'id' | 'staffNumber' | 'joinedDate'>) =>
      apiClient.post<StaffRecord>('/api/staff', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all() });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffRecord> }) =>
      apiClient.put<StaffRecord>(`/api/staff/${id}`, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.staff.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all() });
    },
  });
}
