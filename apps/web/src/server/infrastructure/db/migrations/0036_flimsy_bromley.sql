ALTER TABLE "products" DROP CONSTRAINT "products_service_start_rule_check";--> statement-breakpoint
-- Remap legacy service_start_rule values to the new 3-rule set before re-adding the check.
UPDATE "products" SET "service_start_rule" = CASE "service_start_rule"
	WHEN 'first_verified_usage_at' THEN 'verified_usage'
	WHEN 'app_entitlement_started_at' THEN 'access_granted'
	WHEN 'charge_succeeded_at' THEN 'billing_time'
	WHEN 'billing_period_start' THEN 'billing_time'
	WHEN 'merchant_provided' THEN 'billing_time'
	ELSE "service_start_rule"
END
WHERE "service_start_rule" IN ('first_verified_usage_at', 'app_entitlement_started_at', 'charge_succeeded_at', 'billing_period_start', 'merchant_provided');--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_service_start_rule_check" CHECK ("products"."service_start_rule" is null or "products"."service_start_rule" in ('verified_usage', 'access_granted', 'billing_time'));