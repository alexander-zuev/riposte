CREATE TABLE "dispute_collected_evidence" (
	"dispute_case_id" text PRIMARY KEY NOT NULL,
	"customer_match" jsonb,
	"identity_facts" jsonb,
	"activity_evidence" jsonb,
	"visual_deliverables" jsonb,
	"refund_evidence" jsonb,
	"cancellation_evidence" jsonb,
	"uncategorized_evidence" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dispute_collected_evidence" ADD CONSTRAINT "dispute_collected_evidence_dispute_case_id_dispute_cases_id_fk" FOREIGN KEY ("dispute_case_id") REFERENCES "public"."dispute_cases"("id") ON DELETE cascade ON UPDATE no action;