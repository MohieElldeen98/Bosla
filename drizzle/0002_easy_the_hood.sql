CREATE TYPE "public"."cms_navigation_location" AS ENUM('header', 'footer_product', 'footer_company', 'footer_resources');--> statement-breakpoint
CREATE TYPE "public"."cms_section_type" AS ENUM('hero', 'featured_instructors', 'featured_courses', 'categories', 'testimonials', 'faq', 'statistics', 'cta');--> statement-breakpoint
CREATE TABLE "cms_media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"alt" jsonb NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"placeholder" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_navigation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location" "cms_navigation_location" NOT NULL,
	"label" jsonb NOT NULL,
	"href" text NOT NULL,
	"icon" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"seo_meta_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"section_type" "cms_section_type" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_seo_meta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" jsonb,
	"description" jsonb,
	"og_image_id" uuid,
	"canonical_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_seo_meta_id_cms_seo_meta_id_fk" FOREIGN KEY ("seo_meta_id") REFERENCES "public"."cms_seo_meta"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_sections" ADD CONSTRAINT "cms_sections_page_id_cms_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_seo_meta" ADD CONSTRAINT "cms_seo_meta_og_image_id_cms_media_assets_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."cms_media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cms_navigation_items_location_position_idx" ON "cms_navigation_items" USING btree ("location","position");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_pages_slug_key" ON "cms_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cms_sections_page_position_idx" ON "cms_sections" USING btree ("page_id","position");--> statement-breakpoint
CREATE INDEX "cms_sections_type_idx" ON "cms_sections" USING btree ("section_type");