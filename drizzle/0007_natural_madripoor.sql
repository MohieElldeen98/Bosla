CREATE TABLE "course_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"course_id" uuid NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "subtitle" jsonb;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "short_description" jsonb;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "is_free" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "estimated_duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "certificate_available" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "requirements" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "learning_objectives" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "target_audience" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "thumbnail_id" uuid;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "trailer_video_id" uuid;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "seo_meta_id" uuid;--> statement-breakpoint
ALTER TABLE "course_audit_logs" ADD CONSTRAINT "course_audit_logs_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_audit_logs" ADD CONSTRAINT "course_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_audit_logs_course_id_idx" ON "course_audit_logs" USING btree ("course_id","created_at");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_thumbnail_id_cms_media_assets_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."cms_media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_trailer_video_id_cms_media_assets_id_fk" FOREIGN KEY ("trailer_video_id") REFERENCES "public"."cms_media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_seo_meta_id_cms_seo_meta_id_fk" FOREIGN KEY ("seo_meta_id") REFERENCES "public"."cms_seo_meta"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_estimated_duration_minutes_check" CHECK ("courses"."estimated_duration_minutes" IS NULL OR "courses"."estimated_duration_minutes" >= 0);