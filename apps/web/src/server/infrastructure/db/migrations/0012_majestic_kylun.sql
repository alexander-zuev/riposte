CREATE TABLE "stripe_dispute_contexts" (
	"dispute_case_id" text PRIMARY KEY NOT NULL,
	"charge_id" text NOT NULL,
	"payment_intent_id" text,
	"charge_created_at" timestamp with time zone NOT NULL,
	"stripe_customer_id" text,
	"customer_email" text,
	"customer_name" text,
	"invoice_id" text,
	"invoice_pdf_url" text,
	"subscription_id" text,
	"plan_name" text,
	"plan_amount_minor" integer,
	"plan_currency" text,
	"plan_interval" text,
	"subscription_status" text,
	"total_paid_minor" integer,
	"total_paid_currency" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dispute_cases" RENAME COLUMN "created_at" TO "stripe_created_at";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" ADD CONSTRAINT "stripe_dispute_contexts_dispute_case_id_dispute_cases_id_fk" FOREIGN KEY ("dispute_case_id") REFERENCES "public"."dispute_cases"("id") ON DELETE cascade ON UPDATE no action;