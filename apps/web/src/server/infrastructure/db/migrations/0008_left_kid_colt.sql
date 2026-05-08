DELETE FROM "stripe_connections";--> statement-breakpoint
ALTER TABLE "stripe_connections" ADD COLUMN "stripe_business_name" text NOT NULL;
