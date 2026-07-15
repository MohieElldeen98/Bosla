CREATE TABLE "article_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "series_position" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "article_series_slug_key" ON "article_series" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "article_series_is_active_idx" ON "article_series" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_series_id_article_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."article_series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_series_position_idx" ON "articles" USING btree ("series_id","series_position");