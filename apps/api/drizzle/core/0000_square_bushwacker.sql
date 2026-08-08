CREATE TABLE "academic_careers" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "admin_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"details" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advanced_standing" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"program_id" text NOT NULL,
	"course_id" text NOT NULL,
	"standing_type" text NOT NULL,
	"approved_by" text,
	"approved_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_drafts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"application_data" text NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_number_counters" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_serial" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_status_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"changed_by" text NOT NULL,
	"old_status" text,
	"new_status" text NOT NULL,
	"notes" text,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"program" text NOT NULL,
	"degree_level" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"personal_statement" text,
	"prior_education" text,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"reviewer_id" text,
	"reviewer_notes" text,
	"application_number" text,
	"high_school" text,
	"graduation_year" integer,
	"gpa" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"serial_number" text NOT NULL,
	"degree_title" text NOT NULL,
	"issue_date" timestamp NOT NULL,
	"gpa" real,
	"status" text DEFAULT 'ISSUED' NOT NULL,
	"content_hash" text NOT NULL,
	"verification_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_media" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"r2_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"uploader_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"author_id" text NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"author_id" text NOT NULL,
	"published_at" timestamp,
	"tags" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_generation_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"code_type" text NOT NULL,
	"generated_code" text NOT NULL,
	"context" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
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
	"school_id" text,
	"description" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"user_id" text NOT NULL,
	"doc_type" text NOT NULL,
	"file_name" text NOT NULL,
	"r2_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" integer DEFAULT 0 NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp,
	"expires_at" timestamp,
	"is_sensitive" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"to_address" text NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"uid" text,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"due_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "isced_fields" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"label" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"entry_type" text NOT NULL,
	"amount" real NOT NULL,
	"currency" text DEFAULT 'XAF' NOT NULL,
	"description" text,
	"reference_type" text,
	"reference_id" text,
	"term_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifecycle_events" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text,
	"application_id" text,
	"stage" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"actor_id" text,
	"notes" text,
	"error_detail" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metadata" (
	"id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "metadata_id_key_pk" PRIMARY KEY("id","key")
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'website_footer' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"template_key" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"body_text" text,
	"variables" text DEFAULT '[]' NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
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
	"career_code" text,
	"isced_code" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provisioning_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"ip_address" text NOT NULL,
	"endpoint" text NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "rate_limits_ip_address_endpoint_window_start_pk" PRIMARY KEY("ip_address","endpoint","window_start")
);
--> statement-breakpoint
CREATE TABLE "recommendation_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"referee_name" text NOT NULL,
	"referee_email" text NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"document_id" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "regno_counters" (
	"program_id" text NOT NULL,
	"admission_year" integer NOT NULL,
	"last_serial" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "regno_counters_program_id_admission_year_pk" PRIMARY KEY("program_id","admission_year")
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"faculty_id" text NOT NULL,
	"dean_id" text,
	"description" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_programs" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"registration_number" text,
	"program_id" text NOT NULL,
	"admission_year" integer NOT NULL,
	"enrollment_date" timestamp NOT NULL,
	"completion_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"current_flag" integer DEFAULT 1 NOT NULL,
	"graduated_flag" integer DEFAULT 0 NOT NULL,
	"cgpa" real,
	"classification" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_settings" (
	"student_id" text PRIMARY KEY NOT NULL,
	"directory_release" integer DEFAULT 1 NOT NULL,
	"communications_opt_in" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_event_log" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"payload" text NOT NULL,
	"target_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "transcript_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"format" text DEFAULT 'pdf' NOT NULL,
	"r2_key" text,
	"error" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "transfer_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_name" text NOT NULL,
	"source_course_code" text,
	"source_course_title" text,
	"source_credits" real NOT NULL,
	"awarded_credits" real DEFAULT 0 NOT NULL,
	"equivalent_course_id" text,
	"recipient_program_id" text,
	"term_id" text,
	"decision" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"review_notes" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uid_counters" (
	"id" integer PRIMARY KEY NOT NULL,
	"last_serial" integer DEFAULT 0 NOT NULL
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
CREATE TABLE "webhook_dead_letters" (
	"id" text PRIMARY KEY NOT NULL,
	"event_log_id" text NOT NULL,
	"payload" text NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
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
	"term_id" text NOT NULL,
	"section_code" text NOT NULL,
	"instructor_id" text,
	"capacity" integer DEFAULT 0 NOT NULL,
	"room" text,
	"schedule" text,
	"is_active" integer DEFAULT 1 NOT NULL,
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
	"id" text PRIMARY KEY NOT NULL,
	"curriculum_id" text NOT NULL,
	"course_id" text NOT NULL,
	"is_mandatory" integer DEFAULT 1 NOT NULL,
	"elective_group" text,
	"prerequisite_ids" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_curriculum" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"term_id" text NOT NULL,
	"term_number" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubrics" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"course_id" text,
	"criteria" text NOT NULL,
	"total_points" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
	"term_id" text NOT NULL,
	"registration_type" text NOT NULL,
	"status" text DEFAULT 'registered' NOT NULL,
	"section_id" text,
	"registered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_holds" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"hold_type" text NOT NULL,
	"reason" text NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
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
CREATE TABLE "timetabling" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"instructor_id" text,
	"classroom_id" text,
	"day_of_week" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "alumni_donations" (
	"id" text PRIMARY KEY NOT NULL,
	"alumni_id" text NOT NULL,
	"amount" real NOT NULL,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"purpose" text DEFAULT 'General' NOT NULL,
	"reference" text,
	"status" text DEFAULT 'received' NOT NULL,
	"donated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alumni_events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_date" timestamp NOT NULL,
	"location" text,
	"is_virtual" integer DEFAULT 0 NOT NULL,
	"meet_link" text,
	"capacity" integer,
	"rsvp_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alumni_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"graduation_year" integer,
	"program" text,
	"current_employer" text,
	"current_role" text,
	"linkedin_url" text,
	"location" text,
	"bio" text,
	"is_public" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"course_id" text,
	"term_id" text,
	"date" timestamp NOT NULL,
	"status" text DEFAULT 'Present' NOT NULL,
	"remarks" text,
	"recorded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hostel_room_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"hostel_id" text NOT NULL,
	"room_number" text NOT NULL,
	"check_in_date" timestamp NOT NULL,
	"check_out_date" timestamp,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hostels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'Male' NOT NULL,
	"capacity" integer DEFAULT 0 NOT NULL,
	"occupied" integer DEFAULT 0 NOT NULL,
	"location" text,
	"status" text DEFAULT 'Available' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"location" text,
	"status" text DEFAULT 'In Stock' NOT NULL,
	"cost_per_unit" real DEFAULT 0 NOT NULL,
	"supplier" text,
	"last_restocked" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_records" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"condition_name" text NOT NULL,
	"blood_type" text,
	"visit_date" timestamp DEFAULT now() NOT NULL,
	"attending_staff" text,
	"status" text DEFAULT 'Normal' NOT NULL,
	"vitals" text DEFAULT '{}' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"is_read" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_centers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"location" text,
	"address" text,
	"phone" text,
	"email" text,
	"director_id" text,
	"capacity" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_passes" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"route_id" text NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_to" timestamp NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_routes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"departure_time" text NOT NULL,
	"capacity" integer DEFAULT 30 NOT NULL,
	"fare" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"email" text,
	"id_type" text DEFAULT 'National ID' NOT NULL,
	"id_number" text,
	"purpose" text NOT NULL,
	"host_name" text,
	"host_department" text,
	"check_in" timestamp DEFAULT now() NOT NULL,
	"check_out" timestamp,
	"status" text DEFAULT 'Checked In' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "academic_terms_code_unique" ON "academic_terms" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_user" ON "admin_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_action" ON "admin_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_created" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_advanced_standing_student" ON "advanced_standing" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_advanced_standing_program" ON "advanced_standing" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "idx_status_logs_app_id" ON "application_status_logs" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_apps_user_id" ON "applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_apps_status" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_applications_number" ON "applications" USING btree ("application_number");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_serial_number_unique" ON "certificates" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "idx_certificates_student" ON "certificates" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_media_r2_key_unique" ON "cms_media" USING btree ("r2_key");--> statement-breakpoint
CREATE INDEX "idx_cms_media_uploader" ON "cms_media" USING btree ("uploader_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_pages_slug_unique" ON "cms_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_cms_pages_status" ON "cms_pages" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_posts_slug_unique" ON "cms_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_cms_posts_status" ON "cms_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cms_posts_published_at" ON "cms_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_code_gen_type" ON "code_generation_logs" USING btree ("code_type");--> statement-breakpoint
CREATE INDEX "idx_code_gen_created" ON "code_generation_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_contact_status" ON "contact_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_contact_created" ON "contact_submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_contact_email" ON "contact_submissions" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_code_unique" ON "courses" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_courses_department" ON "courses" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_courses_program" ON "courses" USING btree ("program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_code_unique" ON "departments" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_departments_faculty" ON "departments" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "idx_departments_school" ON "departments" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_r2_key_unique" ON "documents" USING btree ("r2_key");--> statement-breakpoint
CREATE INDEX "idx_docs_application_id" ON "documents" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_docs_user_id" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_docs_archived" ON "documents" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "idx_docs_expires" ON "documents" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_email_logs_status" ON "email_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_email_logs_to" ON "email_logs" USING btree ("to_address");--> statement-breakpoint
CREATE UNIQUE INDEX "email_verifications_token_unique" ON "email_verifications" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_email_verif_user" ON "email_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "faculties_code_unique" ON "faculties" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_invoices_student" ON "invoices" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_uid" ON "invoices" USING btree ("uid");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_uid_unique" ON "ledger_accounts" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "idx_ledger_accounts_uid" ON "ledger_accounts" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "idx_ledger_entries_account" ON "ledger_entries" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_entries_term" ON "ledger_entries" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_entries_type" ON "ledger_entries" USING btree ("entry_type");--> statement-breakpoint
CREATE UNIQUE INDEX "lifecycle_events_idempotency_key_unique" ON "lifecycle_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_lifecycle_uid" ON "lifecycle_events" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "idx_lifecycle_app_id" ON "lifecycle_events" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_lifecycle_stage" ON "lifecycle_events" USING btree ("stage","status");--> statement-breakpoint
CREATE INDEX "idx_lifecycle_created" ON "lifecycle_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscribers_email_unique" ON "newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_newsletter_status" ON "newsletter_subscribers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_templates_template_key_unique" ON "notification_templates" USING btree ("template_key");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_id_unique" ON "oauth_accounts" USING btree ("provider","provider_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_user" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_token_unique" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_pwd_reset_user" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "persons_uid_unique" ON "persons" USING btree ("uid");--> statement-breakpoint
CREATE UNIQUE INDEX "programs_code_unique" ON "programs" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_programs_department" ON "programs" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_programs_career" ON "programs" USING btree ("career_code");--> statement-breakpoint
CREATE INDEX "idx_programs_isced" ON "programs" USING btree ("isced_code");--> statement-breakpoint
CREATE INDEX "idx_provisioning_uid" ON "provisioning_jobs" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "idx_provisioning_status" ON "provisioning_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_rate_limits_ip" ON "rate_limits" USING btree ("ip_address","window_start");--> statement-breakpoint
CREATE UNIQUE INDEX "recommendation_requests_token_unique" ON "recommendation_requests" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_recs_app_id" ON "recommendation_requests" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_code_unique" ON "schools" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_student_progs_uid" ON "student_programs" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "idx_student_progs_program" ON "student_programs" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "idx_student_progs_current" ON "student_programs" USING btree ("uid","current_flag");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_student_progs_one_current" ON "student_programs" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "idx_support_tickets_student" ON "support_tickets" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_event_log_status" ON "sync_event_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_event_log_type" ON "sync_event_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_event_log_created" ON "sync_event_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_transcript_jobs_student_id" ON "transcript_jobs" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_transfer_credits_student" ON "transfer_credits" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_transfer_credits_decision" ON "transfer_credits" USING btree ("decision");--> statement-breakpoint
CREATE INDEX "idx_transfer_credits_program" ON "transfer_credits" USING btree ("recipient_program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_dead_letters_event" ON "webhook_dead_letters" USING btree ("event_log_id");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_standing_student_term_unique" ON "academic_standing_records" USING btree ("student_id","term_id");--> statement-breakpoint
CREATE INDEX "idx_standing_records_student" ON "academic_standing_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_standing_records_term" ON "academic_standing_records" USING btree ("term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_sections_course_term_code_unique" ON "course_sections" USING btree ("course_id","term_id","section_code");--> statement-breakpoint
CREATE INDEX "idx_course_sections_course" ON "course_sections" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_sections_term" ON "course_sections" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "idx_course_sections_instr" ON "course_sections" USING btree ("instructor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_student_course_unique" ON "enrollments" USING btree ("student_id","course_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_student" ON "enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_course" ON "enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_term" ON "enrollments" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "idx_grades_enrollment" ON "grades" USING btree ("enrollment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_courses_curriculum_course_unique" ON "program_courses" USING btree ("curriculum_id","course_id");--> statement-breakpoint
CREATE INDEX "idx_program_courses_curriculum" ON "program_courses" USING btree ("curriculum_id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_curriculum_program_term_unique" ON "program_curriculum" USING btree ("program_id","term_id");--> statement-breakpoint
CREATE INDEX "idx_program_curriculum_program" ON "program_curriculum" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "idx_rubrics_course" ON "rubrics" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "standing_rules_rule_name_unique" ON "standing_rules" USING btree ("rule_name");--> statement-breakpoint
CREATE UNIQUE INDEX "student_course_registrations_student_course_term_unique" ON "student_course_registrations" USING btree ("student_id","course_id","term_id");--> statement-breakpoint
CREATE INDEX "idx_student_course_reg_term" ON "student_course_registrations" USING btree ("student_id","term_id");--> statement-breakpoint
CREATE INDEX "idx_student_course_reg_section" ON "student_course_registrations" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "idx_student_holds_student" ON "student_holds" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_profiles_student_id_unique" ON "student_profiles" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_reg_no_unique" ON "students" USING btree ("reg_no");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_students_student_id" ON "students" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_students_uid" ON "students" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "idx_students_status" ON "students" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_students_user_id" ON "students" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_timetabling_course" ON "timetabling" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_timetabling_instructor" ON "timetabling" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "idx_timetabling_day" ON "timetabling" USING btree ("day_of_week");--> statement-breakpoint
CREATE INDEX "idx_leave_requests_staff" ON "leave_requests" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_leave_requests_status" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payroll_staff" ON "payroll_records" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_period" ON "payroll_records" USING btree ("period");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_staff_no_unique" ON "staff" USING btree ("staff_no");--> statement-breakpoint
CREATE INDEX "idx_staff_department" ON "staff" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_library_category" ON "library_books" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_library_isbn" ON "library_books" USING btree ("isbn");--> statement-breakpoint
CREATE INDEX "idx_borrowings_book" ON "library_borrowings" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "idx_borrowings_student" ON "library_borrowings" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_borrowings_status" ON "library_borrowings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_fines_student" ON "library_fines" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_fines_borrowing" ON "library_fines" USING btree ("borrowing_id");--> statement-breakpoint
CREATE INDEX "idx_donations_alumni" ON "alumni_donations" USING btree ("alumni_id");--> statement-breakpoint
CREATE INDEX "idx_alumni_events_date" ON "alumni_events" USING btree ("event_date");--> statement-breakpoint
CREATE UNIQUE INDEX "alumni_profiles_user_id_unique" ON "alumni_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_student" ON "attendance_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_course" ON "attendance_records" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_hostel_assignments_student" ON "hostel_room_assignments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_hostel_assignments_hostel" ON "hostel_room_assignments" USING btree ("hostel_id");--> statement-breakpoint
CREATE INDEX "idx_medical_records_student" ON "medical_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE UNIQUE INDEX "study_centers_code_unique" ON "study_centers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_passes_student" ON "transport_passes" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_passes_route" ON "transport_passes" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "idx_visitors_checkin" ON "visitors" USING btree ("check_in");