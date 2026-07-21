CREATE TYPE "public"."commission_rate_type" AS ENUM('percentage', 'fixed_amount');--> statement-breakpoint
CREATE TYPE "public"."commission_rule_scope" AS ENUM('global', 'instructor', 'course');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'scheduled', 'processing', 'paid', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."revenue_allocation_kind" AS ENUM('sale', 'refund_reversal', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."revenue_allocation_status" AS ENUM('pending', 'available', 'paid');--> statement-breakpoint
CREATE TABLE "commission_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructor_id" uuid NOT NULL,
	"allocation_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text NOT NULL,
	"reason" text NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" "commission_rule_scope" NOT NULL,
	"scope_id" uuid,
	"recipient_type" text DEFAULT 'instructor' NOT NULL,
	"rate_type" "commission_rate_type" NOT NULL,
	"rate_value" numeric(10, 2) NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_rules_rate_value_check" CHECK ("commission_rules"."rate_value" >= 0),
	CONSTRAINT "commission_rules_percentage_range_check" CHECK ("commission_rules"."rate_type" <> 'percentage' OR ("commission_rules"."rate_value" >= 0 AND "commission_rules"."rate_value" <= 100)),
	CONSTRAINT "commission_rules_scope_id_check" CHECK (("commission_rules"."scope" = 'global' AND "commission_rules"."scope_id" IS NULL) OR ("commission_rules"."scope" <> 'global' AND "commission_rules"."scope_id" IS NOT NULL)),
	CONSTRAINT "commission_rules_effective_window_check" CHECK ("commission_rules"."effective_to" IS NULL OR "commission_rules"."effective_to" > "commission_rules"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "instructor_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructor_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"pending_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"available_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"paid_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"lifetime_earnings" numeric(12, 2) DEFAULT '0' NOT NULL,
	"refund_adjustments" numeric(12, 2) DEFAULT '0' NOT NULL,
	"manual_adjustments" numeric(12, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructor_id" uuid NOT NULL,
	"method" text NOT NULL,
	"currency" text NOT NULL,
	"account_name" text NOT NULL,
	"account_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"currency" text NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"notes" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"instructor_id" uuid NOT NULL,
	"payout_account_id" uuid,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payout_items_amount_check" CHECK ("payout_items"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "revenue_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"order_item_id" uuid,
	"payment_id" uuid,
	"kind" "revenue_allocation_kind" NOT NULL,
	"recipient_type" text NOT NULL,
	"instructor_id" uuid,
	"commission_rule_id" uuid,
	"currency" text NOT NULL,
	"basis_amount" numeric(10, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "revenue_allocation_status" DEFAULT 'pending' NOT NULL,
	"payout_item_id" uuid,
	"reversal_key" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"actor_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commission_adjustments" ADD CONSTRAINT "commission_adjustments_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_adjustments" ADD CONSTRAINT "commission_adjustments_allocation_id_revenue_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."revenue_allocations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_adjustments" ADD CONSTRAINT "commission_adjustments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructor_balances" ADD CONSTRAINT "instructor_balances_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_batches" ADD CONSTRAINT "payout_batches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_batch_id_payout_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."payout_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_payout_account_id_payout_accounts_id_fk" FOREIGN KEY ("payout_account_id") REFERENCES "public"."payout_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_allocations" ADD CONSTRAINT "revenue_allocations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_allocations" ADD CONSTRAINT "revenue_allocations_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_allocations" ADD CONSTRAINT "revenue_allocations_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_allocations" ADD CONSTRAINT "revenue_allocations_commission_rule_id_commission_rules_id_fk" FOREIGN KEY ("commission_rule_id") REFERENCES "public"."commission_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_audit_logs" ADD CONSTRAINT "revenue_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commission_adjustments_instructor_idx" ON "commission_adjustments" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "commission_rules_scope_idx" ON "commission_rules" USING btree ("scope","scope_id");--> statement-breakpoint
CREATE INDEX "commission_rules_effective_idx" ON "commission_rules" USING btree ("effective_from","effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "instructor_balances_instructor_currency_key" ON "instructor_balances" USING btree ("instructor_id","currency");--> statement-breakpoint
CREATE INDEX "payout_accounts_instructor_idx" ON "payout_accounts" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "payout_batches_status_idx" ON "payout_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payout_items_batch_idx" ON "payout_items" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "payout_items_instructor_idx" ON "payout_items" USING btree ("instructor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payout_items_batch_instructor_key" ON "payout_items" USING btree ("batch_id","instructor_id");--> statement-breakpoint
CREATE INDEX "revenue_allocations_order_id_idx" ON "revenue_allocations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "revenue_allocations_instructor_idx" ON "revenue_allocations" USING btree ("instructor_id","status");--> statement-breakpoint
CREATE INDEX "revenue_allocations_created_at_idx" ON "revenue_allocations" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_allocations_sale_key" ON "revenue_allocations" USING btree ("order_id","order_item_id","recipient_type","instructor_id") WHERE "revenue_allocations"."kind" = 'sale';--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_allocations_reversal_key" ON "revenue_allocations" USING btree ("reversal_key","order_item_id","recipient_type","instructor_id") WHERE "revenue_allocations"."kind" = 'refund_reversal';--> statement-breakpoint
CREATE INDEX "revenue_audit_logs_entity_idx" ON "revenue_audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "revenue_audit_logs_created_at_idx" ON "revenue_audit_logs" USING btree ("created_at");