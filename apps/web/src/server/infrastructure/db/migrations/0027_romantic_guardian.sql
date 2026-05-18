CREATE TABLE "dispute_playbooks" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"playbook_md" text NOT NULL,
	"playbook_hash" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dispute_playbooks_version_positive_check" CHECK ("dispute_playbooks"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "dispute_playbooks" ADD CONSTRAINT "dispute_playbooks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_playbooks" ADD CONSTRAINT "dispute_playbooks_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dispute_playbooks_product_version_unique" ON "dispute_playbooks" USING btree ("product_id","version");--> statement-breakpoint
CREATE INDEX "dispute_playbooks_product_version_idx" ON "dispute_playbooks" USING btree ("product_id","version" DESC NULLS LAST);