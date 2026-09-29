# PLAN: WAHA Engine — WhatsApp Web Client

> **Status:** Final, siap implementasi.
> **Prioritas:** Baca & balas pesan stabil dulu (P0). Fitur tambahan belakangan.

---

## TL;DR

WhatsApp Web client (UI mirip WhatsApp Web) pakai **WAHA (NOWEB engine)** + **Elysia (Bun)** + **PostgreSQL** + **React SPA**. Deploy via PM2. Semua pesan/media tersimpan, real-time via SSE, multi-user dengan RBAC.

---

## Arsitektur

```
┌─────────────┐     API/SSE          ┌──────────────┐
│  React SPA  │◄────────────────────►│  Elysia API  │
│  (port 5173 │                      │  (port 4000)  │
│  dev / dist)│                      │  Bun + PM2   │
└─────────────┘                      └──────┬───────┘
                                            │ HTTP + Webhook
                                      ┌─────▼──────┐
                                      │    WAHA    │
                                      │  (port 3000)│
                                      │  NOWEB eng │
                                      │  PM2       │
                                      └──────┬──────┘
                                             │
                                      ┌──────▼──────┐
                                      │ PostgreSQL  │
                                      │ (shared)    │
                                      └─────────────┘
```

**Incoming:** WAHA webhook → Elysia `/webhook` → PostgreSQL → SSE push → React UI
**Outgoing:** UI → Elysia → WAHA REST → WhatsApp → webhook confirm → DB → SSE → UI

---

## Tech Stack

| Layer | Tech |
|---|---|
| Runtime | Bun 1.2+ |
| API Server | Elysia.js + CORS + OpenAPI |
| WAHA | devlikeapro/waha (NOWEB engine, standalone via PM2) |
| Database | PostgreSQL (shared: WAHA + app, schema isolasi `app_`) |
| Frontend | React 18 + Vite + TailwindCSS + react-virtuoso |
| Auth | JWT (jose) + argon2id (Bun.password) |
| Realtime | SSE (ring buffer 500–1000) |
| Process Manager | PM2 |

---

## Prioritas Implementasi

| P | Fokus | Status |
|---|---|---|
| **P0** | WAHA NOWEB stabil + QR + session persist | ⬜ |
| **P0** | Webhook → DB (message, message.any, message.ack) + HMAC | ⬜ |
| **P0** | Send text + optimistic insert + poll fallback + retry | ⬜ |
| **P0** | Messages + status + chats list + contacts dasar | ⬜ |
| **P0** | Media: metadata simpan dulu, download async queue | ⬜ |
| **P1** | SSE + React chat UI + bubble + input + virtual scroll | ⬜ |
| **P1** | Cursor pagination `(wa_timestamp, id)` | ⬜ |
| **P1** | Edit history + deleted flag + reactions | ⬜ |
| **P1** | Contact avatar save + update | ⬜ |
| **P1** | Read detail (dikirim/diterima/dibaca kapan) | ⬜ |
| **P2** | Groups + receipts per participant | ⬜ |
| **P2** | Status/story (schema siap, logic belakangan) | ⬜ |
| **P2** | Multi-user + RBAC | ⬜ |
| **P3** | Cleanup retention 90 hari + disk monitor + FTS + star | ⬜ |
| **P3** | Presence, group view, polish | ⬜ |

> ⚠️ Jangan kerjakan UserModal / GroupDrawer / star sebelum **send + receive stabil end-to-end**.

---

## Project Structure

```
waha-engine/
├── src/
│   ├── index.ts                    # Entry: migrate → seed → start
│   ├── config.ts                   # Env vars
│   ├── logger.ts                   # Pino logger
│   ├── shutdown.ts                 # Graceful shutdown
│   ├── auth/
│   │   ├── index.ts                # JWT + password middleware
│   │   └── rate-limit.ts
│   ├── db/
│   │   ├── client.ts               # Postgres connection
│   │   ├── migrate.ts              # Migration runner
│   │   ├── seed.ts                 # User seeding
│   │   └── migrations/
│   │       ├── 001_init.sql        # Full schema
│   │       └── 002_cleanup.sql     # Retention job (P3)
│   ├── server/
│   │   ├── index.ts                # Elysia bootstrap
│   │   ├── auth.ts                 # Auth routes
│   │   ├── session.ts              # WAHA session proxy
│   │   ├── messages.ts             # Message CRUD + WAHA proxy
│   │   ├── contacts.ts             # Contact routes
│   │   ├── groups.ts               # Group routes
│   │   ├── files.ts                # GET /files/{type}/{filename}
│   │   ├── presence.ts             # Presence routes
│   │   ├── users.ts                # User management
│   │   ├── webhook.ts              # WAHA webhook receiver
│   │   └── sse.ts                  # SSE endpoint
│   ├── waha/
│   │   ├── client.ts               # WAHA REST client wrapper
│   │   ├── webhook-handler.ts      # Process webhook events → DB
│   │   └── sse-pubsub.ts           # SSE pub/sub (buffer 500–1000)
│   └── stores/
│       ├── message-store.ts        # Message queries + cursor pagination
│       ├── contact-store.ts
│       ├── group-store.ts
│       ├── reaction-store.ts
│       ├── status-store.ts
│       └── chat-store.ts
├── Media/
│   ├── picture/                    # image, sticker
│   ├── video/                      # video
│   ├── audio/                      # voice, audio
│   ├── document/                   # pdf, doc
│   └── contact_avatar/             # foto profil kontak
├── web/                            # React SPA (Vite)
│   ├── src/
│   │   ├── api/                    # client, auth, messages, session, contacts, groups
│   │   ├── hooks/                  # useSSE, useAuth, useChat, useSession
│   │   ├── stores/                 # Zustand: auth, chat, session, contact, ui
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── Login/
│   │   │   ├── Sidebar/            # Sidebar, ChatList, ChatItem, SearchBar, FilterButtons
│   │   │   ├── Chat/               # ChatView, ChatHeader, MessageArea, MessageBubble, InputArea, ReplyPreview, TypingIndicator
│   │   │   ├── Modals/             # Settings, User, NewChat, MediaViewer, GroupDrawer
│   │   │   └── shared/             # Avatar, EmojiPicker, Toast, ScrollFAB
│   │   └── styles/globals.css      # WhatsApp dark theme + Tailwind
├── waha/                           # WAHA clone (pinned tag)
├── ecosystem.config.js             # PM2
├── .env.example
└── package.json
```

---

## Arsitektur & Perbaikan

### 1. WAHA Pin Versi & Fallback

- Pin WAHA ke **tag/commit spesifik** (jangan track main)
- Update: pull → cek changelog → test session sebelum production
- Fallback: NOWEB bermasalah → switch ke WEBJS/GOWS tanpa ubah Elysia
- Backup folder session + media secara rutin

```bash
git clone --branch <TAG> https://github.com/devlikeapro/waha.git waha/
```

### 2. PostgreSQL Isolasi Schema

- Tabel app: prefix `app_`
- WAHA: auto-create `waha_*`
- Migration app **tidak boleh** menyentuh tabel WAHA
- Backup & restore mempertimbangkan kedua set

### 3. Optimistic Write + Poll Fallback + Retry

1. `POST /messages/send-*` sukses → **langsung insert** DB status `pending`
2. Webhook `message.any`/`message.ack` → update status (`sent` → `delivered` → `read`)
3. 30 detik masih `pending` → **poll WAHA** sebelum mark failed
4. UI: **tombol retry** jika `failed`

```
pending → (30s) poll WAHA
  → ada di WAHA → sent/delivered
  → tidak ketemu → failed + "retry kirim"
```

```typescript
setTimeout(async () => {
  const msg = await getMessage(id);
  if (msg.status !== 'pending') return;
  const wahaStatus = await waha.getMessageStatus(id);
  if (wahaStatus?.key?.id) {
    await updateStatus(id, 'sent');
  } else {
    await updateStatus(id, 'failed');
    ssePush({ type: 'message_failed', messageId: id });
  }
}, 30_000);
```

### 4. SSE Multi-Komputer

- Auth: **cookie** (priority) → `?token=` (fallback)
- `Last-Event-ID` + ring buffer **500–1000** — wajib
- Keepalive 30s, retry 3000ms, backpressure handling
- 10 PC / 1 server: in-memory OK. Multi-instance → Redis pub/sub

### 5. Media Storage (Mirip WhatsApp Asli)

**Prinsip:** Metadata simpan dulu (cepat), download async (queue).

```
Media/
├── picture/          # image, sticker
├── video/
├── audio/
├── document/
└── contact_avatar/
```

- **Naming:** `{messageId}_{timestamp}.{ext}`
- **Avatar:** `Media/contact_avatar/{jid}.jpg`
- **Path di DB:** relatif, bukan URL absolut

**Incoming media flow:**
1. Webhook punya media → **metadata dulu** (cepat)
2. **Queue async** download (concurrency 2–3, PQueue)
3. UI: **placeholder** → ganti file lokal saat selesai
4. Pesan teks tetap muncul meski media antri
5. Update `app_messages`: `has_media`, `media_path`, `media_mime`, dll

**Serving:**
```
GET /files/{type}/{filename}    # auth wajib + path traversal protection
                                # Cache-Control: private, max-age=86400
```

**Outgoing:**
```
UI multipart (limit 50MB) → simpan sementara → upload WAHA
  → optimistic insert + pending → webhook confirm → status update
```

### 6. Webhook Security

- HMAC verification **wajib** — tolak tanpa signature valid

```typescript
import { createHmac } from 'crypto';
function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  return signature === expected;
}
```

### 7. Health & Observability

- `GET /health` → DB + WAHA session status
- Session bukan `WORKING` → UI banner "WhatsApp terputus"
- Log error ke `app_error_log`
- Alert jika session down > N menit

```typescript
app.get('/health', async () => {
  const dbOk = await checkDb();
  const session = await waha.getSession();
  return {
    status: dbOk && session?.state === 'WORKING' ? 'ok' : 'degraded',
    db: dbOk, session: session?.state, uptime: process.uptime(),
  };
});
```

### 8. Contacts + Foto Profil

- Sync: session WORKING → upsert `app_contacts`
- Foto: sha256 hash → bandingkan `avatar_url_hash` → simpan jika beda
- Update: lazy (buka chat) + periodik (6–24 jam)

### 9. Read Receipt

- `sent_at` → 1 centang, `delivered_at` → 2, `read_at` → 2 biru + waktu
- UI: tap/long-press → "Dikirim / Diterima / Dibaca: ..."
- Mark read: `POST /messages/read` → WAHA sendSeen → update `unread_count`

### 10. Edit & Delete

**Edit:** insert `app_message_edits` (old → new), `is_edited=true`. UI: label *Diedit* + riwayat.
**Delete:** `is_deleted=true`, placeholder *"Pesan ini dihapus"*, media tetap di disk. Jangan hard-delete row.

### 11. Pagination & Virtual Scroll

- **Cursor:** `(wa_timestamp, id)` — bukan OFFSET
- **React:** `react-virtuoso` untuk 1000+ pesan

```sql
WHERE (chat_jid, wa_timestamp, id) < ($1, $2, $3)
ORDER BY wa_timestamp DESC, id DESC LIMIT 50
```

### 12. Story / Status

- Schema siap (`app_status_items`, `app_status_views`)
- Logic belakangan — best-effort

### 13. Retention & Disk Monitor

- Cleanup: **90 hari** untuk messages + media
- Disk monitor: alert jika `Media/` > threshold
- WAHA store: kebijakan terpisah
- Cron: `croner` periodic cleanup

### 14. Data Flow Ringkas

**Incoming:**
```
webhook → HMAC → upsert contact/group → upsert message (metadata)
  → queue download async (jika media) → edit/revoke/ack/reaction
  → update app_chats → SSE
```

**Outgoing:**
```
UI → Elysia → WAHA API → optimistic insert + pending → SSE
  → webhook ack → status update → 30s poll → retry jika perlu
```

---

## Database Schema (001_init.sql)

```sql
-- ===================== USERS =====================
CREATE TABLE app_users (
  id            UUID PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'agent',
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
  group_jid       TEXT PRIMARY KEY,
  subject         TEXT,
  description     TEXT,
  owner_jid       TEXT,
  avatar_path     TEXT,
  participant_count INT,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE app_group_participants (
  group_jid      TEXT REFERENCES app_groups(group_jid) ON DELETE CASCADE,
  participant_jid TEXT,
  is_admin       BOOLEAN DEFAULT false,
  joined_at      TIMESTAMPTZ,
  PRIMARY KEY (group_jid, participant_jid)
);

-- ===================== MESSAGES =====================
CREATE TABLE app_messages (
  id              TEXT PRIMARY KEY,
  chat_jid        TEXT NOT NULL,
  from_jid        TEXT,
  from_me         BOOLEAN NOT NULL DEFAULT false,
  participant     TEXT,
  message_type    TEXT NOT NULL,
  body            TEXT,
  quoted_id       TEXT,
  forwarded       BOOLEAN DEFAULT false,
  is_starred      BOOLEAN DEFAULT false,
  has_media       BOOLEAN DEFAULT false,
  media_path      TEXT,
  media_mime      TEXT,
  media_filename  TEXT,
  media_size      BIGINT,
  media_width     INT,
  media_height    INT,
  media_duration  INT,
  media_thumb_path TEXT,
  is_edited       BOOLEAN DEFAULT false,
  edited_at       TIMESTAMPTZ,
  is_deleted      BOOLEAN DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  deleted_by_me   BOOLEAN DEFAULT false,
  wa_timestamp    TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (id, chat_jid)
);
CREATE INDEX idx_messages_chat_time ON app_messages(chat_jid, wa_timestamp DESC);
CREATE INDEX idx_messages_from_me ON app_messages(from_me);
CREATE INDEX idx_messages_type ON app_messages(message_type);
CREATE INDEX idx_messages_deleted ON app_messages(is_deleted) WHERE is_deleted = true;

-- ===================== MESSAGE EDITS =====================
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

-- ===================== MESSAGE STATUS =====================
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
CREATE INDEX idx_status_chat ON app_message_status(chat_jid);

CREATE TABLE app_message_receipts (
  message_id      TEXT NOT NULL,
  participant_jid TEXT NOT NULL,
  status          TEXT NOT NULL,
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

-- ===================== CHATS =====================
CREATE TABLE app_chats (
  chat_jid             TEXT PRIMARY KEY,
  chat_type            TEXT NOT NULL,
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
```

---

## Phase 1: Project Setup & WAHA Integration

### Step 1: Initialize project
- `bun init`, install deps: `elysia`, `@elysiajs/cors`, `@elysiajs/openapi`, `jose`, `postgres`, `croner`, `pino`, `pino-pretty`
- TS config: ESNext, bundler, strict, path alias `@/*`
- `.env.example`, git init

### Step 2: WAHA setup
- Clone pinned tag, install deps (Node ≥22, yarn, Rust nightly, wasm-pack)
- WAHA `.env`:
  ```
  WHATSAPP_DEFAULT_ENGINE=NOWEB
  WAHA_API_KEY=<generated>
  WAHA_DASHBOARD_USERNAME=admin
  WAHA_DASHBOARD_PASSWORD=<generated>
  WAHA_MEDIA_STORAGE=LOCAL
  WHATSAPP_FILES_FOLDER=./.media
  WHATSAPP_SESSIONS_POSTGRESQL_URL=postgres://...
  WHATSAPP_WEBHOOK_URL=http://localhost:4000/webhook
  WHATSAPP_WEBHOOK_HMAC_KEY=<secret>
  ```
- `config.noweb.store.enabled=true`

### Step 3: Database
- Shared PostgreSQL, `app_` prefix
- Migration: `.sql` files sorted alphabetically, track di `schema_migrations`
- Jalankan `001_init.sql`

---

## Phase 2: Backend API (Elysia)

### Step 4: Auth
- JWT (jose, HS256, 7 hari), cookie `waha_session` (HttpOnly)
- Argon2id via `Bun.password`, rate limit 5/15min/IP
- Routes: login, logout, me, register (admin)

### Step 5: WAHA client
- `src/waha/client.ts` — typed REST: start/stop/getSession/getQR/sendText/sendImage/sendFile/forward/setPresence/getChats/getContacts/getGroups/getMessages
- Config: `WAHA_BASE_URL`, `WAHA_API_KEY`, `WAHA_SESSION_NAME`

### Step 6: Webhook receiver
- `POST /webhook`, HMAC wajib
- Event routing: message, message.any, message.ack, reaction, edited, revoked, presence, session.status, group.v2.*

### Step 7: Messages API
- GET list/search/:jid, POST send-text/send-reply/send-media/delete/edit/star/react/read
- Optimistic insert → poll fallback → retry

### Step 8: Contacts, Groups, Files
- GET contacts, groups, groups/:id/participants
- GET `/files/{type}/{filename}` — serve lokal, auth + path traversal protection

### Step 9: SSE
- `GET /sse/live`, cookie-first, ring buffer 500–1000
- Last-Event-ID replay, keepalive 30s

### Step 10: Users
- CRUD admin-only

---

## Phase 3: Frontend (React SPA)

### Step 11: Setup
- Vite + React 18 + TS + TailwindCSS + Zustand
- Dev proxy: `/api` → `localhost:4000`

### Step 12: Layout & Login
- Login: centered card. Main: sidebar (300–400px) + chat area

### Step 13–15: Components
- Sidebar: ChatList, ChatItem, SearchBar, FilterButtons
- Chat: ChatView, ChatHeader, MessageArea, MessageBubble, InputArea, ReplyPreview, TypingIndicator
- Modals: Settings, User, NewChat, MediaViewer, GroupDrawer
- Shared: Avatar, EmojiPicker, Toast, ScrollFAB

### Step 16: SSE hook
- useSSE: EventSource + auto-reconnect + exponential backoff

### Step 17: Zustand stores
- auth, chat, session, contact, ui

### Step 18: WhatsApp dark theme
- `--bg: #111b21`, `--panel: #202c33`, `--accent: #00a884`
- Bubbles: incoming `#262d31`, outgoing `#056162`

---

## Phase 4: Deploy

### Step 19: Build
- Vite → `web/dist/`, Elysia serve static

### Step 20: PM2
```js
module.exports = {
  apps: [
    { name: 'waha', script: 'yarn', args: 'start', cwd: './waha',
      env: { WHATSAPP_DEFAULT_ENGINE: 'NOWEB', WHATSAPP_SESSIONS_POSTGRESQL_URL: 'postgres://...' } },
    { name: 'api', script: 'bun', args: 'run src/index.ts', cwd: '.', env: { PORT: 4000 } }
  ]
};
```

### Step 21: Hardening
- Rate limit, input validation, pino logging, graceful shutdown, health check, log retention cron

---

## Referensi (WAGSS)
- `sse-pubsub.ts` — SSE pub/sub + ring buffer
- `message-store.ts` — DB query patterns
- `outgoing.ts` — PQueue sequential send
- `server/auth.ts` — Auth + rate limiting
- `db/migrate.ts` — Migration runner
- `client/style.css` — WhatsApp dark theme

---

## Verification

### Functional
1. PM2: waha + api running
2. WAHA dashboard: `localhost:3000/dashboard`
3. QR scan: `GET /session/qr`
4. Webhook test: curl + HMAC
5. Messages di PostgreSQL setelah webhook
6. SSE → React real-time
7. Send via UI → muncul di WhatsApp
8. Multi-user + RBAC
9. `bun test` passes

### Stability
- [ ] Session hidup setelah restart PM2 / reboot
- [ ] Pesan masuk < 2 detik
- [ ] Kirim → centang update
- [ ] Refresh browser → dari DB
- [ ] 2–3 tab / 2 PC → tidak double/hilang
- [ ] WAHA restart → session restore (no QR ulang)
- [ ] HMAC ditolak jika signature salah
- [ ] Media > 10MB tidak timeout
- [ ] Chat 1000+ smooth (cursor + virtual scroll)
- [ ] Burst media → UI tidak freeze (queue)
- [ ] Timeout pending → poll dulu, baru failed + retry

### "Sama Seperti WA"
- [ ] Semua pesan ada di DB, urut `wa_timestamp`
- [ ] Media tersimpan di folder, path di DB
- [ ] Refresh → chat + media tetap ada
- [ ] Edit: "Diedit" + riwayat
- [ ] Delete: "Pesan ini dihapus", row tidak hilang
- [ ] Centang 1/2/biru + waktu
- [ ] Kontak + foto ter-update
- [ ] Unread count benar
- [ ] Quote/reply resolve ke pesan lama

---

## Batasan Jujur

| Fitur WA Asli | Di Gateway Ini |
|---|---|
| Chat, media, edit, delete, centang, kontak | Mendekati penuh |
| Foto profil kontak | Bisa (poll/sync) |
| Status/story | Best-effort (bergantung NOWEB) |
| Channel/community penuh | Terbatas / belakangan |
| E2E encryption | Session di device; server simpan plain setelah decrypt |

---

## Decisions

- WAHA standalone PM2 (bukan Docker)
- PostgreSQL shared + **schema isolasi** `app_`
- **Pin WAHA** ke tag spesifik
- **Optimistic write + poll fallback + retry**
- **Media: metadata first + async download queue**
- **Cursor pagination** (bukan OFFSET)
- **Virtual scroll** (`react-virtuoso`)
- React SPA + TailwindCSS + Zustand
- Multi-user RBAC
- WAHA API_KEY + **HMAC verification**
- **Cookie-first** SSE auth
- **Ring buffer 500–1000**
- **Retention 90 hari** + disk monitor
- **Upload limit 50MB**

---

## Urutan Eksekusi

```
1. WAHA pin versi + session persist
2. Webhook → DB (message + ack) + HMAC
3. Optimistic send + poll fallback + retry
4. Media: metadata + queue download ke Media/{type}/
5. SSE (buffer 500–1000) + list chat + bubble + input
6. Cursor pagination + virtual scroll
7. Edit/delete/avatar/read detail
8. Multi-user + RBAC
9. Groups + receipts
10. Status/story (jika engine support)
11. Cleanup retention + disk monitor + FTS + polish
```
