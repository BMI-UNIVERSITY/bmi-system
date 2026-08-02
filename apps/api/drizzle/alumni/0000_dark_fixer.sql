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
CREATE INDEX "idx_donations_alumni" ON "alumni_donations" USING btree ("alumni_id");--> statement-breakpoint
CREATE INDEX "idx_alumni_events_date" ON "alumni_events" USING btree ("event_date");--> statement-breakpoint
CREATE UNIQUE INDEX "alumni_profiles_user_id_unique" ON "alumni_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_passes_student" ON "transport_passes" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_passes_route" ON "transport_passes" USING btree ("route_id");