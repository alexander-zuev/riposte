CREATE TABLE "dispute_evidence_packets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"dispute_case_id" text NOT NULL,
	"version" integer NOT NULL,
	"stripe_evidence_payload" jsonb NOT NULL,
	"pdf_document" jsonb NOT NULL,
	"artifacts" jsonb NOT NULL,
	"evidence_quality" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "dispute_evidence_packets_case_version_unique" UNIQUE("dispute_case_id","version")
);
--> statement-breakpoint
ALTER TABLE "dispute_evidence_packets" ADD CONSTRAINT "dispute_evidence_packets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_evidence_packets" ADD CONSTRAINT "dispute_evidence_packets_dispute_case_id_dispute_cases_id_fk" FOREIGN KEY ("dispute_case_id") REFERENCES "public"."dispute_cases"("id") ON DELETE cascade ON UPDATE no action;