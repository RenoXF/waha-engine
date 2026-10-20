-- ============================================================
-- 002_optimize — semua index, dipisah dari 001_init.
-- Definisi tabel tetap di 001; file ini hanya percepatan query.
-- Tiap index di sini punya query nyata di src/ yang memakainya.
-- ============================================================

-- ===================== CONTACTS =====================
-- Sidebar kontak: ORDER BY push_name ASC NULLS LAST
CREATE INDEX idx_contacts_push_name ON app_contacts (push_name);
-- Cari kontak dari nomor.
CREATE INDEX idx_contacts_phone     ON app_contacts (phone);

-- ===================== MESSAGES =====================
-- Query terpanas: daftar pesan satu chat, terbaru dulu (cursor pagination).
CREATE INDEX idx_messages_chat_time ON app_messages (chat_jid, wa_timestamp DESC, id DESC);
-- Tab "Calls": WHERE message_type = 'call_notification'.
CREATE INDEX idx_messages_type      ON app_messages (message_type);
-- Sampah kecil: cuma baris yang terhapus.
CREATE INDEX idx_messages_deleted   ON app_messages (is_deleted) WHERE is_deleted = true;

CREATE INDEX idx_edits_message ON app_message_edits (message_id, edited_at DESC);
CREATE INDEX idx_status_chat   ON app_message_status (chat_jid);

-- ===================== CHATS =====================
-- Sidebar: ORDER BY is_pinned DESC, last_message_at DESC NULLS LAST
CREATE INDEX idx_chats_order ON app_chats (is_pinned DESC, last_message_at DESC NULLS LAST);

-- ===================== LOG =====================
CREATE INDEX idx_logs_created ON app_logs (created_at DESC);
CREATE INDEX idx_logs_level   ON app_logs (level, created_at DESC);
