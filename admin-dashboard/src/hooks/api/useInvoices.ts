import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FeeInvoice } from '../../types';
import { apiClient } from './apiClient';
import { queryKeys } from './queryKeys';

export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices.all(),
    queryFn: () => apiClient.get<FeeInvoice[]>('/api/invoices'),
    staleTime: 1000 * 60 * 2,
  });
}

export function useStudentInvoices(studentId: string) {
  return useQuery({
    queryKey: queryKeys.invoices.byStudent(studentId),
    queryFn: () => apiClient.get<FeeInvoice[]>('/api/invoices'),
    select: (invoices) => invoices.filter((inv) => inv.studentId === studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<FeeInvoice, 'id' | 'invoiceNumber' | 'issueDate' | 'amountPaid' | 'status'>
    ) => apiClient.post<FeeInvoice>('/api/invoices', data),
    onSuccess: (newInvoice) => {
      queryClient.setQueryData<FeeInvoice[]>(queryKeys.invoices.all(), (old) =>
        old ? [newInvoice, ...old] : [newInvoice]
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.byStudent(newInvoice.studentId),
      });
    },
  });
}

interface ProcessPaymentArgs {
  invoiceId: string;
  amountPaid: number;
  currentAmountPaid: number;
  totalAmount: number;
  scholarshipDiscount: number;
}

export function useProcessPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      amountPaid,
      currentAmountPaid,
      totalAmount,
      scholarshipDiscount,
    }: ProcessPaymentArgs) => {
      const newTotalPaid = currentAmountPaid + amountPaid;
      const effectiveTotal = totalAmount - scholarshipDiscount;

      let status: FeeInvoice['status'];
      if (newTotalPaid >= effectiveTotal) {
        status = 'Paid';
      } else if (newTotalPaid > 0) {
        status = 'Partial';
      } else {
        status = 'Unpaid';
      }

      return apiClient.put<FeeInvoice>(`/api/invoices/${invoiceId}`, {
        amountPaid: newTotalPaid,
        status,
      });
    },
    onMutate: async ({ invoiceId, amountPaid, currentAmountPaid, totalAmount, scholarshipDiscount }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.invoices.all() });
      const previous = queryClient.getQueryData<FeeInvoice[]>(queryKeys.invoices.all());

      const newTotalPaid = currentAmountPaid + amountPaid;
      const effectiveTotal = totalAmount - scholarshipDiscount;
      const status: FeeInvoice['status'] =
        newTotalPaid >= effectiveTotal ? 'Paid' : newTotalPaid > 0 ? 'Partial' : 'Unpaid';

      queryClient.setQueryData<FeeInvoice[]>(queryKeys.invoices.all(), (old) =>
        old?.map((inv) =>
          inv.id === invoiceId ? { ...inv, amountPaid: newTotalPaid, status } : inv
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.invoices.all(), context.previous);
      }
    },
    onSettled: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
      if (data?.studentId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.invoices.byStudent(data.studentId),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.students.all() });
      }
    },
  });
}

export function useApplyScholarship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      scholarshipAmount,
    }: {
      invoiceId: string;
      scholarshipAmount: number;
    }) =>
      apiClient.put<FeeInvoice>(`/api/invoices/${invoiceId}`, {
        scholarshipDiscount: scholarshipAmount,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<FeeInvoice[]>(queryKeys.invoices.all(), (old) =>
        old?.map((inv) => (inv.id === updated.id ? updated : inv))
      );
    },
  });
}
