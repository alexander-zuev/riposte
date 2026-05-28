CREATE TABLE "dispute_case_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"dispute_case_id" text NOT NULL,
	"run_id" uuid NOT NULL,
	"message_id" text NOT NULL,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dispute_case_messages_dispute_case_id_message_id_unique" UNIQUE("dispute_case_id","message_id")
);
--> statement-breakpoint
ALTER TABLE "dispute_case_messages" ADD CONSTRAINT "dispute_case_messages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_case_messages" ADD CONSTRAINT "dispute_case_messages_dispute_case_id_dispute_cases_id_fk" FOREIGN KEY ("dispute_case_id") REFERENCES "public"."dispute_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dispute_case_messages_product_case_created_at_idx" ON "dispute_case_messages" USING btree ("product_id","dispute_case_id","created_at");--> statement-breakpoint
CREATE INDEX "dispute_case_messages_run_id_idx" ON "dispute_case_messages" USING btree ("run_id");