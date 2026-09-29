-- ===================== USERS (app login) =====================
CREATE TABLE app_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'agent', -- admin | agent
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

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
CREATE INDEX idx_contacts_phone ON app_contacts(phone);
CREATE INDEX idx_contacts_push_name ON app_contacts(push_name);

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
  group_jid      TEXT REFERENCES app_groups(group_jid) ON DELETE CASCADE,
  participant_jid TEXT,
  is_admin       BOOLEAN DEFAULT false,
  joined_at      TIMESTAMPTZ DEFAULT now(),
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
  updated_at       TIMESTAMPTZ DEFAULT now(),

  UNIQUE (id, chat_jid)
);
CREATE INDEX idx_messages_chat_time ON app_messages(chat_jid, wa_timestamp DESC);
CREATE INDEX idx_messages_from_me ON app_messages(from_me);
CREATE INDEX idx_messages_type ON app_messages(message_type);
CREATE INDEX idx_messages_deleted ON app_messages(is_deleted) WHERE is_deleted = true;

-- ===================== MESSAGE EDITS (riwayat) =====================
CREATE TABLE app_message_edits (
  id         BIGSERIAL PRIMARY KEY,
  message_id TEXT NOT NULL,
  chat_jid   TEXT NOT NULL,
  old_body   TEXT,
  new_body   TEXT,
  edited_at  TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_edits_message ON app_message_edits(message_id, edited_at);

-- ===================== MESSAGE STATUS (centang + waktu) =====================
CREATE TABLE app_message_status (
  message_id    TEXT PRIMARY KEY,
  chat_jid      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | sent | delivered | read | failed
  pending_at    TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,
  failed_at     TIMESTAMPTZ,
  error_message TEXT,
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_status_chat ON app_message_status(chat_jid);

CREATE TABLE app_message_receipts (
  message_id      TEXT NOT NULL,
  participant_jid TEXT NOT NULL,
  status          TEXT NOT NULL, -- delivered | read
  at              TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (message_id, participant_jid, status)
);

-- ===================== REACTIONS =====================
CREATE TABLE app_message_reactions (
  message_id  TEXT NOT NULL,
  chat_jid    TEXT NOT NULL,
  reactor_jid TEXT NOT NULL,
  emoji       TEXT NOT NULL,
  reacted_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (message_id, reactor_jid)
);

-- ===================== CHATS (sidebar list) =====================
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
CREATE INDEX idx_chats_last ON app_chats(last_message_at DESC NULLS LAST);

-- ===================== STATUS / STORY (best-effort) =====================
CREATE TABLE app_status_items (
  id           TEXT PRIMARY KEY,
  owner_jid    TEXT NOT NULL,
  message_type TEXT,
  body         TEXT,
  media_path   TEXT,
  media_mime   TEXT,
  wa_timestamp TIMESTAMPTZ NOT NULL,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE app_status_views (
  status_id  TEXT NOT NULL,
  viewer_jid TEXT NOT NULL,
  viewed_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (status_id, viewer_jid)
);

-- ===================== ERROR LOG =====================
CREATE TABLE app_error_log (
  id         BIGSERIAL PRIMARY KEY,
  source     TEXT,
  detail     TEXT,
  payload    JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
