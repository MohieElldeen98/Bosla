ALTER TYPE "public"."payment_status" ADD VALUE 'expired';--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'abandoned';--> statement-breakpoint
ALTER TABLE "order_audit_logs" ADD COLUMN "payment_id" uuid;--> statement-breakpoint
ALTER TABLE "order_audit_logs" ADD COLUMN "actor_type" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_audit_logs" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "attempt_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "expires_at" timestamp with time zone DEFAULT now() + interval '30 minutes' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "expired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "abandoned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "abandoned_reason" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "failure_reason" text;--> statement-breakpoint
CREATE INDEX "order_audit_logs_payment_id_idx" ON "order_audit_logs" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payments_expiry_sweep_idx" ON "payments" USING btree ("status","expires_at");--> statement-breakpoint
ALTER TABLE "order_audit_logs" ADD CONSTRAINT "order_audit_logs_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;