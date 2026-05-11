ALTER TABLE "dispute_cases" RENAME COLUMN "evidence_due_by" TO "evidence_details_due_by";--> statement-breakpoint
DROP INDEX "dispute_cases_evidence_due_by_idx";--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "source_stripe_event_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "source_stripe_event_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "livemode" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "charge" text NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "payment_intent" text;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "payment_method_details_type" text;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "payment_method_details_card_brand" text;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "payment_method_details_card_case_type" text;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "payment_method_details_card_network_reason_code" text;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "enhanced_eligibility_types" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "evidence_details_has_evidence" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "evidence_details_past_due" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "evidence_details_submission_count" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "is_charge_refundable" boolean NOT NULL;--> statement-breakpoint
CREATE INDEX "dispute_cases_evidence_due_by_idx" ON "dispute_cases" USING btree ("evidence_details_due_by");