ALTER TABLE "stripe_dispute_sync_state" ADD COLUMN "livemode" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe_dispute_sync_state" DROP CONSTRAINT "stripe_dispute_sync_state_pkey";--> statement-breakpoint
ALTER TABLE "stripe_dispute_sync_state" ADD CONSTRAINT "stripe_dispute_sync_state_account_mode_pk" PRIMARY KEY("stripe_account_id","livemode");--> statement-breakpoint
ALTER TABLE "stripe_dispute_sync_state" ADD CONSTRAINT "stripe_dispute_sync_state_connection_fk" FOREIGN KEY ("stripe_account_id","livemode") REFERENCES "public"."stripe_connections"("stripe_account_id","livemode") ON DELETE no action ON UPDATE no action;
