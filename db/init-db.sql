-- Local dev: application user (mimics Hyperdrive connection)
CREATE ROLE "riposte-app" WITH LOGIN PASSWORD 'riposte-app';
GRANT pg_read_all_data TO "riposte-app";
GRANT pg_write_all_data TO "riposte-app";
GRANT CONNECT ON DATABASE riposte TO "riposte-app";

-- Test database with same permissions
CREATE DATABASE riposte_test;
GRANT CONNECT ON DATABASE riposte_test TO "riposte-app";
