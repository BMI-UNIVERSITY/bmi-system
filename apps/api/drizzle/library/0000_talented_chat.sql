CREATE TABLE "library_books" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"isbn" text,
	"category" text DEFAULT 'General' NOT NULL,
	"type" text DEFAULT 'Hardcopy' NOT NULL,
	"status" text DEFAULT 'Available' NOT NULL,
	"year" text,
	"description" text,
	"download_url" text,
	"location" text,
	"copies" integer DEFAULT 1 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_borrowings" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"student_id" text NOT NULL,
	"borrow_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp NOT NULL,
	"return_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_fines" (
	"id" text PRIMARY KEY NOT NULL,
	"borrowing_id" text NOT NULL,
	"student_id" text NOT NULL,
	"amount" real DEFAULT 0 NOT NULL,
	"reason" text DEFAULT 'Overdue' NOT NULL,
	"paid" integer DEFAULT 0 NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_library_category" ON "library_books" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_library_isbn" ON "library_books" USING btree ("isbn");--> statement-breakpoint
CREATE INDEX "idx_borrowings_book" ON "library_borrowings" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "idx_borrowings_student" ON "library_borrowings" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_borrowings_status" ON "library_borrowings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_fines_student" ON "library_fines" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_fines_borrowing" ON "library_fines" USING btree ("borrowing_id");