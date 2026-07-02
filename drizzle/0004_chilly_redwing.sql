CREATE TABLE "cms_page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by" uuid
);
--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cms_page_versions" ADD CONSTRAINT "cms_page_versions_page_id_cms_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_page_versions" ADD CONSTRAINT "cms_page_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_page_versions" ADD CONSTRAINT "cms_page_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cms_page_versions_page_version_key" ON "cms_page_versions" USING btree ("page_id","version");--> statement-breakpoint
CREATE INDEX "cms_page_versions_page_id_idx" ON "cms_page_versions" USING btree ("page_id","version");