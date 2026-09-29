-- 002_cleanup.sql — Retention cleanup (run via cron or manually)
-- Delete messages older than 90 days
DELETE FROM app_messages WHERE wa_timestamp < now() - interval '90 days';
DELETE FROM app_message_edits WHERE created_at < now() - interval '90 days';
DELETE FROM app_message_status WHERE updated_at < now() - interval '90 days';
DELETE FROM app_message_reactions WHERE reacted_at < now() - interval '90 days';
DELETE FROM app_message_receipts WHERE at < now() - interval '90 days';
DELETE FROM app_error_log WHERE created_at < now() - interval '30 days';
DELETE FROM app_status_items WHERE expires_at < now();
