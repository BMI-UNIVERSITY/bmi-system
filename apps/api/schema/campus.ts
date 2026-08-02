import { pgTable, text, integer, real, timestamp, index } from 'drizzle-orm/pg-core';

export const transportRoutes = pgTable('transport_routes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  departure_time: text('departure_time').notNull(),
  capacity: integer('capacity').notNull().default(30),
  fare: real('fare').notNull().default(0),
  status: text('status').notNull().default('active'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const transportPasses = pgTable('transport_passes', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  route_id: text('route_id').notNull(),
  valid_from: timestamp('valid_from').notNull(),
  valid_to: timestamp('valid_to').notNull(),
  status: text('status').notNull().default('active'),
  issued_at: timestamp('issued_at').notNull().defaultNow(),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('idx_passes_student').on(t.student_id),
  index('idx_passes_route').on(t.route_id),
]);

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  type: text('type').notNull().default('info'),
  title: text('title').notNull(),
  body: text('body'),
  link: text('link'),
  is_read: integer('is_read').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('idx_notifications_user').on(t.user_id),
  index('idx_notifications_unread').on(t.user_id, t.is_read),
]);
