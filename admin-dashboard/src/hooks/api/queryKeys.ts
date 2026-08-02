export const queryKeys = {
  // Students
  students: {
    all: () => ['students'] as const,
    detail: (id: string) => ['students', id] as const,
  },

  // Applications
  applications: {
    all: () => ['applications'] as const,
    detail: (id: string) => ['applications', id] as const,
  },

  // Courses
  courses: {
    all: () => ['courses'] as const,
    detail: (id: string) => ['courses', id] as const,
  },

  // Invoices
  invoices: {
    all: () => ['invoices'] as const,
    byStudent: (studentId: string) => ['invoices', 'student', studentId] as const,
  },

  // Staff
  staff: {
    all: () => ['staff'] as const,
    detail: (id: string) => ['staff', id] as const,
  },

  // Library
  books: {
    all: () => ['books'] as const,
  },
  loans: {
    all: () => ['loans'] as const,
    byStudent: (studentId: string) => ['loans', 'student', studentId] as const,
  },

  // Audit
  auditLogs: {
    all: () => ['audit-logs'] as const,
  },
} as const;
