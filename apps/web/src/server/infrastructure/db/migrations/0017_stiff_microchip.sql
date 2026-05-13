ALTER TABLE "dispute_cases" ADD COLUMN "metadata" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "balance_transaction" text;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "balance_transactions" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "evidence" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD COLUMN "evidence_details_enhanced_eligibility" jsonb NOT NULL;