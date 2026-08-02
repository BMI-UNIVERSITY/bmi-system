import { defineConfig } from 'drizzle-kit';

// Default config: maps the CORE database (bmi-core-db).
// This holds Auth/Users, Programs, and the Academic (students/grades) schemas.
//   - schema/core.ts
//   - schema/academic.ts
//
// Generate: pnpm drizzle-kit generate --config drizzle.config.ts
// Push:     pnpm drizzle-kit push --config drizzle.config.ts

export default defineConfig({
  dialect: 'postgresql',
  schema: ['./schema/core.ts', './schema/academic.ts'],
  out: './drizzle/core',
  dbCredentials: {
    url: process.env.DATABASE_URL_CORE ?? process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
