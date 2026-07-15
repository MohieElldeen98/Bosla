CREATE TYPE "public"."article_language" AS ENUM('en', 'ar');--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "language" "article_language" DEFAULT 'ar' NOT NULL;