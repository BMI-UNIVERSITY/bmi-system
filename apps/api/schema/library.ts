import { pgTable, text, integer, real, timestamp, index } from 'drizzle-orm/pg-core';

export const libraryBooks = pgTable('library_books', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  isbn: text('isbn'),
  category: text('category').notNull().default('General'),
  type: text('type').notNull().default('Hardcopy'),
  status: text('status').notNull().default('Available'),
  year: text('year'),
  description: text('description'),
  download_url: text('download_url'),
  location: text('location'),
  copies: integer('copies').notNull().default(1),
  is_active: integer('is_active').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_library_category').on(t.category),
  index('idx_library_isbn').on(t.isbn),
]);

export const libraryBorrowings = pgTable('library_borrowings', {
  id: text('id').primaryKey(),
  book_id: text('book_id').notNull(),
  student_id: text('student_id').notNull(),
  borrow_date: timestamp('borrow_date').notNull().defaultNow(),
  due_date: timestamp('due_date').notNull(),
  return_date: timestamp('return_date'),
  status: text('status').notNull().default('active'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_borrowings_book').on(t.book_id),
  index('idx_borrowings_student').on(t.student_id),
  index('idx_borrowings_status').on(t.status),
]);

export const libraryFines = pgTable('library_fines', {
  id: text('id').primaryKey(),
  borrowing_id: text('borrowing_id').notNull(),
  student_id: text('student_id').notNull(),
  amount: real('amount').notNull().default(0),
  reason: text('reason').notNull().default('Overdue'),
  paid: integer('paid').notNull().default(0),
  paid_at: timestamp('paid_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_fines_student').on(t.student_id),
  index('idx_fines_borrowing').on(t.borrowing_id),
]);
