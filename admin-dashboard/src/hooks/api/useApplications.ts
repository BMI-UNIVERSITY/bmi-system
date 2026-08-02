import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Application, FeeInvoice, Student } from '../../types';
import { apiClient } from './apiClient';
import { queryKeys } from './queryKeys';

export function useApplications() {
  return useQuery({
    queryKey: queryKeys.applications.all(),
    queryFn: () => apiClient.get<Application[]>('/api/applications'),
    staleTime: 1000 * 60 * 1,
  });
}

export function useAddApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<Application, 'id' | 'applicationNumber' | 'appliedDate' | 'status' | 'documents'>
    ) => apiClient.post<Application>('/api/applications', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all() });
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appId,
      status,
      reviewerNotes,
    }: {
      appId: string;
      status: Application['status'];
      reviewerNotes?: string;
    }) =>
      apiClient.put<Application>(`/api/applications/${appId}`, {
        status,
        ...(reviewerNotes !== undefined ? { reviewerNotes } : {}),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.applications.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all() });
    },
  });
}

export function useUpdateApplicationDocStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appId,
      docIndex,
      status,
      currentDocuments,
    }: {
      appId: string;
      docIndex: number;
      status: 'Pending' | 'Verified' | 'Rejected';
      currentDocuments: Application['documents'];
    }) => {
      const updatedDocs = currentDocuments.map((doc, idx) =>
        idx === docIndex ? { ...doc, status } : doc
      );
      return apiClient.put<Application>(`/api/applications/${appId}`, {
        documents: updatedDocs,
      }).then((res) => ({ res, appId, docIndex, status }));
    },

    onMutate: async ({ appId, docIndex, status, currentDocuments }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.applications.all() });
      const previousApps = queryClient.getQueryData<Application[]>(queryKeys.applications.all());

      queryClient.setQueryData<Application[]>(queryKeys.applications.all(), (old) =>
        old?.map((app) => {
          if (app.id !== appId) return app;
          const newDocs = [...app.documents];
          newDocs[docIndex] = { ...newDocs[docIndex], status };
          return { ...app, documents: newDocs };
        })
      );
      return { previousApps };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousApps) {
        queryClient.setQueryData(queryKeys.applications.all(), context.previousApps);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all() });
    },
  });
}

interface ConversionResult {
  student: Student;
  application: Application;
}

export function useConvertApplicationToStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationId: string) =>
      apiClient.post<ConversionResult>(`/api/applications/${applicationId}/convert`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all() });
    },
  });
}

interface PipelineResult {
  student: Student;
  application: Application;
  invoice: FeeInvoice;
  autoEnrolledCoursesCount: number;
}

export function useRunAutomatedPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationId: string) =>
      apiClient.post<PipelineResult>(`/api/applications/${applicationId}/pipeline`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
    },
  });
}
