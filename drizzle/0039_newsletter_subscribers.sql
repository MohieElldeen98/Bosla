CREATE TYPE "public"."newsletter_subscriber_status" AS ENUM('subscribed', 'unsubscribed');--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"status" "newsletter_subscriber_status" DEFAULT 'subscribed' NOT NULL,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "newsletter_subscribers_email_check" CHECK (length("newsletter_subscribers"."email") > 0)
);
--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_status_created_idx" ON "newsletter_subscribers" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_ip_created_idx" ON "newsletter_subscribers" USING btree ("ip_address","created_at");