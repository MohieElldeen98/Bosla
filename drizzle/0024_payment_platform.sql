CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'succeeded', 'failed', 'canceled', 'partially_refunded', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'failed';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'expired';--> statement-breakpoint
CREATE SEQUENCE "public"."invoice_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1000 CACHE 1;--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"currency" text NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"discount_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid,
	"provider" text NOT NULL,
	"event_type" text NOT NULL,
	"provider_event_id" text,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_payment_id" text,
	"provider_transaction_id" text,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"captured_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"refunded_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"payment_method" text,
	"provider_response" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"idempotency_key" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount" >= 0),
	CONSTRAINT "payments_captured_amount_check" CHECK ("payments"."captured_amount" >= 0),
	CONSTRAINT "payments_refunded_amount_check" CHECK ("payments"."refunded_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_refund_id" text,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"reason" text,
	"provider_response" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_amount_check" CHECK ("refunds"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "max_redemptions_per_user" integer;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "min_subtotal" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "max_discount_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_total" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_redemptions_coupon_order_key" ON "coupon_redemptions" USING btree ("coupon_id","order_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_coupon_user_idx" ON "coupon_redemptions" USING btree ("coupon_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_order_id_key" ON "invoices" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_events_payment_id_idx" ON "payment_events" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_events_provider_idx" ON "payment_events" USING btree ("provider");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_provider_event_key" ON "payment_events" USING btree ("provider","provider_event_id","event_type") WHERE "payment_events"."provider_event_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_provider_idx" ON "payments" USING btree ("provider");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_payment_key" ON "payments" USING btree ("provider","provider_payment_id") WHERE "payments"."provider_payment_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_idempotency_key" ON "payments" USING btree ("idempotency_key") WHERE "payments"."idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "refunds_payment_id_idx" ON "refunds" USING btree ("payment_id");--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_max_redemptions_per_user_check" CHECK ("coupons"."max_redemptions_per_user" IS NULL OR "coupons"."max_redemptions_per_user" > 0);--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_min_subtotal_check" CHECK ("coupons"."min_subtotal" IS NULL OR "coupons"."min_subtotal" >= 0);--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_max_discount_amount_check" CHECK ("coupons"."max_discount_amount" IS NULL OR "coupons"."max_discount_amount" > 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tax_total_check" CHECK ("orders"."tax_total" >= 0);