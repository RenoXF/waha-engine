-- ============================================================
-- WAHA Engine — skema final dalam satu file.
-- 001_init = struktur tabel saja. Semua index ada di 002_optimize.
--
-- Tidak ada app_users: login memakai satu APP_PASSWORD dari .env.
-- Log ada di app_logs (level + message), bukan app_error_log.
-- ============================================================

-- ===================== CONTACTS =====================
CREATE TABLE app_contacts (
  jid             TEXT PRIMARY KEY,
  phone           TEXT,
  push_name       TEXT,
  custom_name     TEXT,
  is_business     BOOLEAN DEFAULT false,
  is_blocked      BOOLEAN DEFAULT false,
  avatar_path     TEXT,
  avatar_url_hash TEXT,
  about           TEXT,
  last_seen_at    TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 73% kontak WAHA datang berjid @lid, bukan nomor. Tabel ini yang
-- menerjemahkan @lid → nomor asli.
CREATE TABLE app_lid_pn_mapping (
  lid        TEXT PRIMARY KEY,
  pn         TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== GROUPS =====================
CREATE TABLE app_groups (
  group_jid         TEXT PRIMARY KEY,
  subject           TEXT,
  description       TEXT,
  owner_jid         TEXT,
  avatar_path       TEXT,
  participant_count INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE app_group_participants (
  group_jid       TEXT NOT NULL REFERENCES app_groups(group_jid) ON DELETE CASCADE,
  participant_jid TEXT NOT NULL,
  is_admin        BOOLEAN DEFAULT false,
  joined_at       TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_jid, participant_jid)
);

-- ===================== MESSAGES =====================
CREATE TABLE app_messages (
  id               TEXT PRIMARY KEY,
  chat_jid         TEXT NOT NULL,
  from_jid         TEXT,
  from_me          BOOLEAN NOT NULL DEFAULT false,
  participant      TEXT,
  message_type     TEXT NOT NULL DEFAULT 'text',
  body             TEXT,
  quoted_id        TEXT,
  forwarded        BOOLEAN DEFAULT false,
  is_starred       BOOLEAN DEFAULT false,

  -- media
  has_media        BOOLEAN DEFAULT false,
  media_path       TEXT,
  media_mime       TEXT,
  media_filename   TEXT,
  media_size       BIGINT,
  media_width      INT,
  media_height     INT,
  media_duration   INT,
  media_thumb_path TEXT,

  -- edit / delete
  is_edited        BOOLEAN DEFAULT false,
  edited_at        TIMESTAMPTZ,
  is_deleted       BOOLEAN DEFAULT false,
  deleted_at       TIMESTAMPTZ,
  deleted_by_me    BOOLEAN DEFAULT false,

  -- timestamps
  wa_timestamp     TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Riwayat edit. body di app_messages selalu versi terbaru.
CREATE TABLE app_message_edits (
  id         BIGSERIAL PRIMARY KEY,
  message_id TEXT NOT NULL,
  chat_jid   TEXT NOT NULL,
  old_body   TEXT,
  new_body   TEXT,
  edited_at  TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Centang: pending | sent | delivered | read | failed
CREATE TABLE app_message_status (
  message_id    TEXT PRIMARY KEY,
  chat_jid      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  pending_at    TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,
  failed_at     TIMESTAMPTZ,
  error_message TEXT,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Siapa yang sudah delivered/read, per peserta grup (event message.ack.group).
CREATE TABLE app_message_receipts (
  message_id      TEXT NOT NULL,
  participant_jid TEXT NOT NULL,
  status          TEXT NOT NULL, -- delivered | read
  at              TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (message_id, participant_jid, status)
);

CREATE TABLE app_message_reactions (
  message_id  TEXT NOT NULL,
  chat_jid    TEXT NOT NULL,
  reactor_jid TEXT NOT NULL, -- jid peserta, atau 'self' untuk reaksi kita
  emoji       TEXT NOT NULL,
  reacted_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (message_id, reactor_jid)
);

-- ===================== CHATS (sidebar) =====================
CREATE TABLE app_chats (
  chat_jid             TEXT PRIMARY KEY,
  chat_type            TEXT NOT NULL, -- contact | group
  name                 TEXT,
  last_message_id      TEXT,
  last_message_at      TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count         INT DEFAULT 0,
  is_muted             BOOLEAN DEFAULT false,
  is_pinned            BOOLEAN DEFAULT false,
  is_archived          BOOLEAN DEFAULT false,
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ===================== LOG =====================
-- Diisi otomatis oleh src/logger.ts (warn/error/fatal saja).
-- Baca lewat GET /logs, tidak perlu pantau terminal.
CREATE TABLE app_logs (
  id         BIGSERIAL PRIMARY KEY,
  level      TEXT NOT NULL DEFAULT 'info',
  source     TEXT,
  message    TEXT NOT NULL DEFAULT '',
  detail     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
