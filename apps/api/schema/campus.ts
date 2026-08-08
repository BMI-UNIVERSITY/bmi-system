import { pgTable, text, integer, real, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

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

// ─── UMS Collections (D1 0010) ────────────────────────────────────────────────
export const studyCenters = pgTable('study_centers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code'),
  location: text('location'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  director_id: text('director_id'),
  capacity: integer('capacity').notNull().default(0),
  is_active: integer('is_active').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('study_centers_code_unique').on(t.code),
]);

export const hostels = pgTable('hostels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().default('Male'),
  capacity: integer('capacity').notNull().default(0),
  occupied: integer('occupied').notNull().default(0),
  location: text('location'),
  status: text('status').notNull().default('Available'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const hostelRoomAssignments = pgTable('hostel_room_assignments', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  hostel_id: text('hostel_id').notNull(),
  room_number: text('room_number').notNull(),
  check_in_date: timestamp('check_in_date').notNull(),
  check_out_date: timestamp('check_out_date'),
  status: text('status').notNull().default('Active'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_hostel_assignments_student').on(t.student_id),
  index('idx_hostel_assignments_hostel').on(t.hostel_id),
]);

export const medicalRecords = pgTable('medical_records', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  condition_name: text('condition_name').notNull(),
  blood_type: text('blood_type'),
  visit_date: timestamp('visit_date').notNull().defaultNow(),
  attending_staff: text('attending_staff'),
  status: text('status').notNull().default('Normal'),
  vitals: text('vitals').notNull().default('{}'),
  notes: text('notes'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_medical_records_student').on(t.student_id),
]);

export const inventoryItems = pgTable('inventory_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category'),
  quantity: integer('quantity').notNull().default(0),
  unit: text('unit').notNull().default('pcs'),
  location: text('location'),
  status: text('status').notNull().default('In Stock'),
  cost_per_unit: real('cost_per_unit').notNull().default(0),
  supplier: text('supplier'),
  last_restocked: timestamp('last_restocked'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const visitors = pgTable('visitors', {
  id: text('id').primaryKey(),
  full_name: text('full_name').notNull(),
  phone: text('phone'),
  email: text('email'),
  id_type: text('id_type').notNull().default('National ID'),
  id_number: text('id_number'),
  purpose: text('purpose').notNull(),
  host_name: text('host_name'),
  host_department: text('host_department'),
  check_in: timestamp('check_in').notNull().defaultNow(),
  check_out: timestamp('check_out'),
  status: text('status').notNull().default('Checked In'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('idx_visitors_checkin').on(t.check_in),
]);

export const attendanceRecords = pgTable('attendance_records', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  course_id: text('course_id'),
  term_id: text('term_id'),
  date: timestamp('date').notNull(),
  status: text('status').notNull().default('Present'),
  remarks: text('remarks'),
  recorded_by: text('recorded_by'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_attendance_student').on(t.student_id),
  index('idx_attendance_course').on(t.course_id),
]);
