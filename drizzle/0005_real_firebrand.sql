CREATE TABLE "cms_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"page_id" uuid NOT NULL,
	"section_id" uuid,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_audit_logs" ADD CONSTRAINT "cms_audit_logs_page_id_cms_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_audit_logs" ADD CONSTRAINT "cms_audit_logs_section_id_cms_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."cms_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_audit_logs" ADD CONSTRAINT "cms_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cms_audit_logs_page_id_idx" ON "cms_audit_logs" USING btree ("page_id","created_at");