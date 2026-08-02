import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuditLog } from '../../types';
import { apiClient } from './apiClient';
import { queryKeys } from './queryKeys';

export function useAuditLogs() {
  return useQuery({
    queryKey: queryKeys.auditLogs.all(),
    queryFn: () => apiClient.get<AuditLog[]>('/api/audit-logs'),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

export function useLogAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (log: {
      action: string;
      details: string;
      severity?: 'Info' | 'Warning' | 'Security';
    }) => apiClient.post<AuditLog>('/api/audit-logs', log),
    onSuccess: (newLog) => {
      queryClient.setQueryData<AuditLog[]>(queryKeys.auditLogs.all(), (old) =>
        old ? [newLog, ...old] : [newLog]
      );
    },
  });
}
