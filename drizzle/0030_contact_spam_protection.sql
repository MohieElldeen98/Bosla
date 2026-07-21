ALTER TABLE "contact_messages" ADD COLUMN "ip_address" text;--> statement-breakpoint
CREATE INDEX "contact_messages_email_created_idx" ON "contact_messages" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "contact_messages_ip_created_idx" ON "contact_messages" USING btree ("ip_address","created_at");