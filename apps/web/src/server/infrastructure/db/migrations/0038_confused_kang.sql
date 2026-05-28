ALTER TABLE "dispute_playbooks" RENAME COLUMN "version" TO "revision";--> statement-breakpoint
ALTER TABLE "dispute_playbooks" DROP CONSTRAINT "dispute_playbooks_version_positive_check";--> statement-breakpoint
DROP INDEX "dispute_playbooks_product_version_unique";--> statement-breakpoint
DROP INDEX "dispute_playbooks_product_version_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "dispute_playbooks_product_revision_unique" ON "dispute_playbooks" USING btree ("product_id","revision");--> statement-breakpoint
CREATE INDEX "dispute_playbooks_product_revision_idx" ON "dispute_playbooks" USING btree ("product_id","revision" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "dispute_playbooks" ADD CONSTRAINT "dispute_playbooks_revision_positive_check" CHECK ("dispute_playbooks"."revision" > 0);