CREATE TABLE "profile_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"target_user_id" uuid NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_navigation_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"navigation_item_id" uuid,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_site_settings_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"setting_key" text NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"category_id" uuid NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_audit_logs" ADD CONSTRAINT "profile_audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_audit_logs" ADD CONSTRAINT "profile_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_navigation_audit_logs" ADD CONSTRAINT "cms_navigation_audit_logs_navigation_item_id_cms_navigation_items_id_fk" FOREIGN KEY ("navigation_item_id") REFERENCES "public"."cms_navigation_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_navigation_audit_logs" ADD CONSTRAINT "cms_navigation_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_site_settings_audit_logs" ADD CONSTRAINT "cms_site_settings_audit_logs_setting_key_cms_site_settings_key_fk" FOREIGN KEY ("setting_key") REFERENCES "public"."cms_site_settings"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_site_settings_audit_logs" ADD CONSTRAINT "cms_site_settings_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_audit_logs" ADD CONSTRAINT "category_audit_logs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_audit_logs" ADD CONSTRAINT "category_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_audit_logs_target_user_id_idx" ON "profile_audit_logs" USING btree ("target_user_id","created_at");--> statement-breakpoint
CREATE INDEX "cms_navigation_audit_logs_created_at_idx" ON "cms_navigation_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cms_site_settings_audit_logs_setting_key_idx" ON "cms_site_settings_audit_logs" USING btree ("setting_key","created_at");--> statement-breakpoint
CREATE INDEX "category_audit_logs_category_id_idx" ON "category_audit_logs" USING btree ("category_id","created_at");