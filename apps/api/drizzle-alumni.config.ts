import { defineConfig } from 'drizzle-kit';

// Alumni + Campus database (bmi-alumni-campus-db) — Alumni, Transport, Notifications.
export default defineConfig({
  dialect: 'postgresql',
  schema: ['./schema/alumni.ts', './schema/campus.ts'],
  out: './drizzle/alumni',
  dbCredentials: {
    url: process.env.DATABASE_URL_ALUMNI ?? '',
  },
  verbose: true,
  strict: true,
});
