CREATE TABLE "legal_document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"title_en" text NOT NULL,
	"title_ar" text NOT NULL,
	"content_en" text NOT NULL,
	"content_ar" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"published_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_document_versions_version_check" CHECK ("legal_document_versions"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_document_id_legal_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."legal_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_document_version_key" ON "legal_document_versions" USING btree ("document_id","version");--> statement-breakpoint
CREATE INDEX "legal_document_versions_document_id_idx" ON "legal_document_versions" USING btree ("document_id");