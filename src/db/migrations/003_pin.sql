-- 003: pin pesan. WAHA tidak expose keadaan pin lewat webhook/event, jadi
-- simpan lokal; unpin/pin di perangkat WhatsApp lain tidak terlihat di sini.
ALTER TABLE app_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
