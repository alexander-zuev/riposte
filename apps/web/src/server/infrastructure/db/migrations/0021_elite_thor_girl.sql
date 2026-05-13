CREATE TABLE "stripe_dispute_sync_state" (
	"stripe_account_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "stripe_dispute_sync_state" ADD CONSTRAINT "stripe_dispute_sync_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;