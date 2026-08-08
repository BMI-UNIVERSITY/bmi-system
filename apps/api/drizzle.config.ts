import { defineConfig } from 'drizzle-kit';

// Default config: maps the CORE database (bmi-core-db).
// During the strangler-fig phase ALL routes go through a single adapter
// bound to DATABASE_URL_CORE, so the core DB must hold every table.
//   - schema/core.ts        (auth/users, programs, finance, cms, lifecycle)
//   - schema/academic.ts    (students, grades, curriculum, standing)
//   - schema/hr.ts          (staff, leave, payroll)
//   - schema/library.ts     (books, borrowings, fines)
//   - schema/alumni.ts      (alumni, events, donations)
//   - schema/campus.ts      (transport, notifications, ums collections)
//
// Generate: pnpm drizzle-kit generate --config drizzle.config.ts
// Push:     pnpm drizzle-kit push --config drizzle.config.ts

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    './schema/core.ts',
    './schema/academic.ts',
    './schema/hr.ts',
    './schema/library.ts',
    './schema/alumni.ts',
    './schema/campus.ts',
  ],
  out: './drizzle/core',
  dbCredentials: {
    url: process.env.DATABASE_URL_CORE ?? process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
