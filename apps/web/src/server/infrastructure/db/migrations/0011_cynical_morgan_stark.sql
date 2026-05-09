CREATE TABLE "dispute_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_account_id" text NOT NULL,
	"stripe_status" text NOT NULL,
	"reason" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"evidence_due_by" timestamp with time zone NOT NULL,
	"workflow_state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD CONSTRAINT "dispute_cases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dispute_cases_user_id_idx" ON "dispute_cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dispute_cases_stripe_account_id_idx" ON "dispute_cases" USING btree ("stripe_account_id");--> statement-breakpoint
CREATE INDEX "dispute_cases_stripe_status_idx" ON "dispute_cases" USING btree ("stripe_status");--> statement-breakpoint
CREATE INDEX "dispute_cases_evidence_due_by_idx" ON "dispute_cases" USING btree ("evidence_due_by");