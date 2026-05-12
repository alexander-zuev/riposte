ALTER TABLE "dispute_cases" ADD COLUMN "customer_purchase_ip" text;--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" ADD COLUMN "charge" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" ADD COLUMN "customer" jsonb;--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" ADD COLUMN "card" jsonb;--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" ADD COLUMN "risk" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" ADD COLUMN "invoice" jsonb;--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" ADD COLUMN "subscription" jsonb;--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" ADD COLUMN "refunds" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" ADD COLUMN "payment_history" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "charge_id";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "payment_intent_id";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "charge_created_at";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "charge_receipt_url";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "customer_email";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "customer_name";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "invoice_id";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "invoice_pdf_url";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "subscription_id";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "subscription_status";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "subscription_items";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "total_paid_by_currency";