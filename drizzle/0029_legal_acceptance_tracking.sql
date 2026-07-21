CREATE TABLE "legal_document_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"accepted_version" integer NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_document_acceptances_version_check" CHECK ("legal_document_acceptances"."accepted_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "legal_document_acceptances" ADD CONSTRAINT "legal_document_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_acceptances_user_slug_key" ON "legal_document_acceptances" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "legal_document_acceptances_user_id_idx" ON "legal_document_acceptances" USING btree ("user_id");