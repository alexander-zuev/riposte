-- Drop existing v4 UUID message data; the factory now emits UUIDv7 so the PK
-- columns start with time-ordered IDs and the B-tree PK index stops paying
-- random-insert cost on the hottest write path. Safe to truncate: no production
-- data to preserve, outbox rows are 7-day-TTL transient, receipts are idempotency
-- markers that get re-created on first message replay.
TRUNCATE TABLE message_outbox;
TRUNCATE TABLE message_receipts;
