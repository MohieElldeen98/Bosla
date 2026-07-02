-- `auth` already exists as Supabase's own managed schema in every real
-- Supabase project; IF NOT EXISTS keeps this migration safe to run there
-- (Drizzle generates a plain CREATE SCHEMA because `auth-users.ts` is a
-- local shadow table it thinks it owns — see that file's comment).
CREATE SCHEMA IF NOT EXISTS "auth";
--> statement-breakpoint
CREATE TYPE "public"."profile_role" AS ENUM('student', 'instructor', 'admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('pending', 'active', 'suspended', 'archived', 'deleted');--> statement-breakpoint
-- `auth.users` is Supabase Auth's own table — this shadow definition only
-- exists so Drizzle can model the FK below; IF NOT EXISTS makes it a no-op
-- against a real Supabase project where the real table already exists with
-- many more columns than the single `id` this shadow declares.
CREATE TABLE IF NOT EXISTS "auth"."users" (
	"id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"display_name" text,
	"avatar_url" text,
	"profession" text,
	"country" text,
	"language" text DEFAULT 'en' NOT NULL,
	"bio" text,
	"website" text,
	"linkedin" text,
	"years_of_experience" integer,
	"specialties" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"role" "profile_role" DEFAULT 'student' NOT NULL,
	"status" "profile_status" DEFAULT 'pending' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "profiles_years_of_experience_check" CHECK ("profiles"."years_of_experience" IS NULL OR "profiles"."years_of_experience" >= 0)
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "profiles_status_idx" ON "profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profiles_country_idx" ON "profiles" USING btree ("country");--> statement-breakpoint
CREATE INDEX "profiles_profession_idx" ON "profiles" USING btree ("profession");--> statement-breakpoint
CREATE INDEX "profiles_display_name_idx" ON "profiles" USING btree ("display_name");