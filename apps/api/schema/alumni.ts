import { pgTable, text, integer, real, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const alumniProfiles = pgTable('alumni_profiles', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  graduation_year: integer('graduation_year'),
  program: text('program'),
  current_employer: text('current_employer'),
  current_role: text('current_role'),
  linkedin_url: text('linkedin_url'),
  location: text('location'),
  bio: text('bio'),
  is_public: integer('is_public').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('alumni_profiles_user_id_unique').on(t.user_id),
]);

export const alumniEvents = pgTable('alumni_events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  event_date: timestamp('event_date').notNull(),
  location: text('location'),
  is_virtual: integer('is_virtual').notNull().default(0),
  meet_link: text('meet_link'),
  capacity: integer('capacity'),
  rsvp_count: integer('rsvp_count').notNull().default(0),
  status: text('status').notNull().default('upcoming'),
  created_by: text('created_by'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_alumni_events_date').on(t.event_date),
]);

export const alumniDonations = pgTable('alumni_donations', {
  id: text('id').primaryKey(),
  alumni_id: text('alumni_id').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('GHS'),
  purpose: text('purpose').notNull().default('General'),
  reference: text('reference'),
  status: text('status').notNull().default('received'),
  donated_at: timestamp('donated_at').notNull().defaultNow(),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('idx_donations_alumni').on(t.alumni_id),
]);
