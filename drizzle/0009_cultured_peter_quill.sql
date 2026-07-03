CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'revoked');--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "status" "enrollment_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
CREATE INDEX "enrollments_status_idx" ON "enrollments" USING btree ("status");