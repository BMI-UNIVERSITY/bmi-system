CREATE TABLE "leave_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"type" text DEFAULT 'Annual' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_records" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"period" text NOT NULL,
	"gross" real DEFAULT 0 NOT NULL,
	"deductions" real DEFAULT 0 NOT NULL,
	"net" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"user_id" text PRIMARY KEY NOT NULL,
	"staff_no" text NOT NULL,
	"department_id" text,
	"designation" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_leave_requests_staff" ON "leave_requests" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_leave_requests_status" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payroll_staff" ON "payroll_records" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_period" ON "payroll_records" USING btree ("period");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_staff_no_unique" ON "staff" USING btree ("staff_no");--> statement-breakpoint
CREATE INDEX "idx_staff_department" ON "staff" USING btree ("department_id");