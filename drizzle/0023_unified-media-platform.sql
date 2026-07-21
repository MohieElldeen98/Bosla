CREATE TYPE "public"."media_processing_status" AS ENUM('pending', 'running', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."media_visibility" AS ENUM('public', 'authenticated', 'private', 'course_protected');--> statement-breakpoint
ALTER TYPE "public"."media_file_type" ADD VALUE 'audio' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."media_file_type" ADD VALUE 'document' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."media_file_type" ADD VALUE 'archive' BEFORE 'other';--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "thumbnail_key" text;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "variants" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "processing_status" "media_processing_status" DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "visibility" "media_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "related_entity" text;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "related_entity_id" uuid;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "dominant_color" text;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "page_count" integer;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "last_used_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "cms_media_assets_visibility_idx" ON "cms_media_assets" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "cms_media_assets_related_idx" ON "cms_media_assets" USING btree ("related_entity","related_entity_id");--> statement-breakpoint
CREATE INDEX "cms_media_assets_last_used_idx" ON "cms_media_assets" USING btree ("last_used_at");