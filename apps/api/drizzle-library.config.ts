import { defineConfig } from 'drizzle-kit';

// Library database (bmi-library-db) — Books, Borrowings, Fines.
export default defineConfig({
  dialect: 'postgresql',
  schema: ['./schema/library.ts'],
  out: './drizzle/library',
  dbCredentials: {
    url: process.env.DATABASE_URL_LIBRARY ?? '',
  },
  verbose: true,
  strict: true,
});
