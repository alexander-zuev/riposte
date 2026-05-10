ALTER TABLE "stripe_dispute_contexts" ADD COLUMN "charge_receipt_url" text;--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" ADD COLUMN "subscription_items" jsonb;--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" ADD COLUMN "total_paid_by_currency" jsonb;--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "plan_name";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "plan_amount_minor";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "plan_currency";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "plan_interval";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "total_paid_minor";--> statement-breakpoint
ALTER TABLE "stripe_dispute_contexts" DROP COLUMN "total_paid_currency";