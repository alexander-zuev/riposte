DELETE FROM "stripe_connections";--> statement-breakpoint
ALTER TABLE "stripe_connections" ADD COLUMN "credential_ciphertext" text NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe_connections" ADD COLUMN "credential_iv" text NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe_connections" ADD COLUMN "credential_key_version" text NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe_connections" DROP COLUMN "access_token";--> statement-breakpoint
ALTER TABLE "stripe_connections" DROP COLUMN "refresh_token";
