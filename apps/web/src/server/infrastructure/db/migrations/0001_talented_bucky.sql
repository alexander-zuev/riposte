-- Only run pg_cron setup in non-test databases
DO $$
BEGIN
  IF current_database() != 'riposte_test' THEN
    -- Enable extension (after enabling in dashboard)
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    -- Cleanup fn
    CREATE OR REPLACE FUNCTION cleanup_7_days_old_messages()
    RETURNS void as $func$
    BEGIN
      -- cleanup message_receipts
      DELETE FROM "public"."message_receipts" WHERE processed_at < now() - interval '7 days';
      -- cleanup only published outbox messages
      DELETE FROM "public"."message_outbox" WHERE published_at IS NOT NULL and published_at < now() - interval '7 days';
    END;
    $func$ LANGUAGE plpgsql;

    -- Schedule daily at 3am UTC
    PERFORM cron.schedule('cleanup_message_tracking', '0 3 * * *', 'SELECT cleanup_7_days_old_messages()');
  END IF;
END $$;
