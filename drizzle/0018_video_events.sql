CREATE TYPE "public"."video_event_type" AS ENUM('play', 'pause', 'complete', 'progress');--> statement-breakpoint
CREATE TABLE "video_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid,
	"article_slug" text,
	"user_id" uuid,
	"event" "video_event_type" NOT NULL,
	"position_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD COLUMN "position_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "video_events" ADD CONSTRAINT "video_events_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_events" ADD CONSTRAINT "video_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_events_lesson_created_idx" ON "video_events" USING btree ("lesson_id","created_at");--> statement-breakpoint
CREATE INDEX "video_events_article_created_idx" ON "video_events" USING btree ("article_slug","created_at");