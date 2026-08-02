import { defineConfig } from 'drizzle-kit';

// HR database (bmi-hr-db) — Staff, Leave Requests, Payroll.
export default defineConfig({
  dialect: 'postgresql',
  schema: ['./schema/hr.ts'],
  out: './drizzle/hr',
  dbCredentials: {
    url: process.env.DATABASE_URL_HR ?? '',
  },
  verbose: true,
  strict: true,
});
