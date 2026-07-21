CREATE TYPE "public"."video_processing_status" AS ENUM('pending', 'running', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('uploading', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"course_id" uuid NOT NULL,
	"lesson_id" uuid,
	"storage_key" text NOT NULL,
	"manifest_key" text,
	"thumbnail_key" text,
	"preview_key" text,
	"duration" integer,
	"size" bigint DEFAULT 0 NOT NULL,
	"mime_type" text NOT NULL,
	"status" "video_status" DEFAULT 'uploading' NOT NULL,
	"processing_status" "video_processing_status" DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"upload_id" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "videos_duration_check" CHECK ("videos"."duration" IS NULL OR "videos"."duration" >= 0),
	CONSTRAINT "videos_size_check" CHECK ("videos"."size" >= 0)
);
--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "videos_course_id_idx" ON "videos" USING btree ("course_id","created_at");--> statement-breakpoint
CREATE INDEX "videos_lesson_id_idx" ON "videos" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "videos_status_idx" ON "videos" USING btree ("status");