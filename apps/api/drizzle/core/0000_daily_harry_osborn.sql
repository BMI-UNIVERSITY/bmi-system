CREATE TABLE "academic_terms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"academic_year" text NOT NULL,
	"semester_number" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"name" text,
	"description" text,
	"level" text,
	"credits" integer NOT NULL,
	"term" text,
	"capacity" integer NOT NULL,
	"department_id" text,
	"program_id" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"faculty_id" text NOT NULL,
	"head_id" text,
	"description" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faculties" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"dean_id" text,
	"description" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metadata" (
	"id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "metadata_id_key_pk" PRIMARY KEY("id","key")
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"national_id" text,
	"passport_no" text,
	"first_name" text,
	"middle_name" text,
	"last_name" text,
	"gender" text,
	"date_of_birth" timestamp,
	"nationality" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"degree_type" text NOT NULL,
	"level" text NOT NULL,
	"department_id" text NOT NULL,
	"duration_years" integer NOT NULL,
	"total_credit_hours" integer NOT NULL,
	"mode_of_study" text NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"role" text DEFAULT 'applicant' NOT NULL,
	"is_verified" integer DEFAULT 0 NOT NULL,
	"verification_token" text,
	"mfa_secret" text,
	"mfa_enabled" integer DEFAULT 0 NOT NULL,
	"session_version" integer DEFAULT 1 NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"account_claimed" integer DEFAULT 0 NOT NULL,
	"student_email" text,
	"person_id" text,
	"admission_code" text,
	"admission_code_expires_at" timestamp,
	"date_of_birth" timestamp,
	"nationality" text,
	"address" text,
	"gender" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_standing_records" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"term_id" text NOT NULL,
	"standing" text NOT NULL,
	"term_gpa" real,
	"cumulative_gpa" real,
	"credits_attempted" real,
	"credits_earned" real,
	"completion_rate" real,
	"rule_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"section_code" text NOT NULL,
	"instructor_id" text,
	"schedule" text,
	"capacity" integer DEFAULT 0 NOT NULL,
	"enrolled" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"course_id" text NOT NULL,
	"status" text DEFAULT 'enrolled' NOT NULL,
	"grade" text,
	"term_id" text,
	"section_id" text,
	"registration_date" timestamp DEFAULT now() NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" text PRIMARY KEY NOT NULL,
	"enrollment_id" text NOT NULL,
	"assessment_type" text NOT NULL,
	"score" real NOT NULL,
	"max_score" real NOT NULL,
	"graded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_courses" (
	"program_id" text NOT NULL,
	"course_id" text NOT NULL,
	"is_required" integer DEFAULT 0 NOT NULL,
	"semester" integer,
	"level" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_curriculum" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"course_id" text NOT NULL,
	"level" integer,
	"semester" integer,
	"core" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standing_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"rule_name" text NOT NULL,
	"standing" text NOT NULL,
	"min_gpa" real,
	"max_gpa" real,
	"max_consecutive_terms" integer,
	"min_completion_rate" real,
	"is_active" integer DEFAULT 1 NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_course_registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"course_id" text NOT NULL,
	"status" text DEFAULT 'registered' NOT NULL,
	"approval_status" text DEFAULT 'pending' NOT NULL,
	"semester" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_holds" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"type" text NOT NULL,
	"reason" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text,
	"resolved_by" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"preferred_name" text,
	"emergency_contact" text,
	"emergency_phone" text,
	"dietary_restrictions" text,
	"disability_info" text,
	"previous_education" text,
	"employment_status" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"user_id" text PRIMARY KEY NOT NULL,
	"student_id" text,
	"uid" text,
	"reg_no" text NOT NULL,
	"previous_reg_no" text,
	"gender" text,
	"date_of_birth" timestamp,
	"nationality" text,
	"admission_date" timestamp NOT NULL,
	"program" text NOT NULL,
	"program_id" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"avatar_color" text,
	"study_center_id" text,
	"gpa" real,
	"year_of_study" integer,
	"graduation_date" timestamp,
	"degree_level" text,
	"photo" text,
	"card_qr_data" text,
	"card_barcode" text,
	"card_issued_at" timestamp,
	"card_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "academic_terms_code_unique" ON "academic_terms" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_code_unique" ON "courses" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_courses_department" ON "courses" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_courses_program" ON "courses" USING btree ("program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_code_unique" ON "departments" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_departments_faculty" ON "departments" USING btree ("faculty_id");--> statement-breakpoint
CREATE UNIQUE INDEX "faculties_code_unique" ON "faculties" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "persons_uid_unique" ON "persons" USING btree ("uid");--> statement-breakpoint
CREATE UNIQUE INDEX "programs_code_unique" ON "programs" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_programs_department" ON "programs" USING btree ("department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_standing_student_term_unique" ON "academic_standing_records" USING btree ("student_id","term_id");--> statement-breakpoint
CREATE INDEX "idx_standing_records_student" ON "academic_standing_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_standing_records_term" ON "academic_standing_records" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "idx_sections_course" ON "course_sections" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_student_course_unique" ON "enrollments" USING btree ("student_id","course_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_student" ON "enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_course" ON "enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_term" ON "enrollments" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "idx_grades_enrollment" ON "grades" USING btree ("enrollment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_courses_program_course_unique" ON "program_courses" USING btree ("program_id","course_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_program" ON "program_curriculum" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_course" ON "program_curriculum" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "standing_rules_rule_name_unique" ON "standing_rules" USING btree ("rule_name");--> statement-breakpoint
CREATE INDEX "idx_registrations_student" ON "student_course_registrations" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_holds_student" ON "student_holds" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_holds_status" ON "student_holds" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "student_profiles_student_id_unique" ON "student_profiles" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_reg_no_unique" ON "students" USING btree ("reg_no");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_students_student_id" ON "students" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_students_uid" ON "students" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "idx_students_status" ON "students" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_students_user_id" ON "students" USING btree ("user_id");