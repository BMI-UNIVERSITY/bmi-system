// Extended Modules Schema — Library, Alumni, Campus, Notifications.
// These tables are split across the `bmi-library-db` and `bmi-alumni-campus-db`
// Neon projects (see drizzle-library.config.ts / drizzle-alumni.config.ts).
// This barrel exists for convenience and to mirror the plan's file layout.

export * from './library';
export * from './alumni';
export * from './campus';
