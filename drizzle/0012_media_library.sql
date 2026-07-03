CREATE TYPE "public"."media_file_type" AS ENUM('image', 'video', 'pdf', 'other');--> statement-breakpoint
CREATE TABLE "cms_media_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_media_assets" ALTER COLUMN "alt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ALTER COLUMN "width" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ALTER COLUMN "height" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "storage_path" text NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "file_type" "media_file_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "mime_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "file_size" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "title" jsonb;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "caption" jsonb;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "description" jsonb;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "folder" text;--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD COLUMN "uploaded_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "cms_media_audit_logs" ADD CONSTRAINT "cms_media_audit_logs_media_asset_id_cms_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."cms_media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_media_audit_logs" ADD CONSTRAINT "cms_media_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cms_media_audit_logs_media_asset_id_idx" ON "cms_media_audit_logs" USING btree ("media_asset_id","created_at");--> statement-breakpoint
ALTER TABLE "cms_media_assets" ADD CONSTRAINT "cms_media_assets_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cms_media_assets_file_type_idx" ON "cms_media_assets" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "cms_media_assets_folder_idx" ON "cms_media_assets" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "cms_media_assets_created_at_idx" ON "cms_media_assets" USING btree ("created_at");