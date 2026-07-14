CREATE TYPE "public"."article_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "article_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"article_id" uuid NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"icon" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" jsonb NOT NULL,
	"excerpt" jsonb,
	"body" jsonb NOT NULL,
	"cover_image_id" uuid,
	"author_id" uuid,
	"category_id" uuid,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"read_time_minutes" integer DEFAULT 1 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"seo_meta_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_read_time_minutes_check" CHECK ("articles"."read_time_minutes" >= 0),
	CONSTRAINT "articles_view_count_check" CHECK ("articles"."view_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "article_audit_logs" ADD CONSTRAINT "article_audit_logs_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_audit_logs" ADD CONSTRAINT "article_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_cover_image_id_cms_media_assets_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."cms_media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_article_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."article_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_seo_meta_id_cms_seo_meta_id_fk" FOREIGN KEY ("seo_meta_id") REFERENCES "public"."cms_seo_meta"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_audit_logs_article_id_idx" ON "article_audit_logs" USING btree ("article_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "article_categories_slug_key" ON "article_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "article_categories_is_active_idx" ON "article_categories" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_key" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "articles_category_id_idx" ON "articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "articles_author_id_idx" ON "articles" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "articles_status_published_at_idx" ON "articles" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "articles_status_view_count_idx" ON "articles" USING btree ("status","view_count");--> statement-breakpoint
-- Seed: the public navbar's "Blog" link (header location, after existing
-- links). Idempotent — skipped if a /blog header item already exists.
INSERT INTO "cms_navigation_items" ("location", "label", "href", "position", "is_enabled")
SELECT 'header',
       '{"en": "Blog", "ar": "المدونة"}'::jsonb,
       '/blog',
       COALESCE((SELECT MAX("position") + 1 FROM "cms_navigation_items" WHERE "location" = 'header'), 0),
       true
WHERE NOT EXISTS (
  SELECT 1 FROM "cms_navigation_items" WHERE "location" = 'header' AND "href" = '/blog'
);
