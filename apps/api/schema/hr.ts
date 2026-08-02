import { pgTable, text, real, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

// ─── Staff (HR module) ───────────────────────────────────────────────────────
export const staff = pgTable('staff', {
  user_id: text('user_id').primaryKey(),
  staff_no: text('staff_no').notNull(),
  department_id: text('department_id'),
  designation: text('designation'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('staff_staff_no_unique').on(t.staff_no),
  index('idx_staff_department').on(t.department_id),
]);

// ─── Leave Requests ──────────────────────────────────────────────────────────
export const leaveRequests = pgTable('leave_requests', {
  id: text('id').primaryKey(),
  staff_id: text('staff_id').notNull(),
  type: text('type').notNull().default('Annual'),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  reason: text('reason'),
  status: text('status').notNull().default('pending'),
  reviewed_by: text('reviewed_by'),
  reviewed_at: timestamp('reviewed_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_leave_requests_staff').on(t.staff_id),
  index('idx_leave_requests_status').on(t.status),
]);

// ─── Payroll Records ─────────────────────────────────────────────────────────
export const payrollRecords = pgTable('payroll_records', {
  id: text('id').primaryKey(),
  staff_id: text('staff_id').notNull(),
  period: text('period').notNull(),
  gross: real('gross').notNull().default(0),
  deductions: real('deductions').notNull().default(0),
  net: real('net').notNull().default(0),
  status: text('status').notNull().default('pending'),
  paid_at: timestamp('paid_at'),
  notes: text('notes'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_payroll_staff').on(t.staff_id),
  index('idx_payroll_period').on(t.period),
]);
