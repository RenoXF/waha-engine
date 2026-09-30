import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { sessionStore } from '../stores/sessionStore';
import { uiStore } from '../stores/uiStore';

export default function ConnectModal() {
  const close = uiStore((s) => s.closeModal);
  const sessionState = sessionStore((s) => s.state);
  const [tab, setTab] = useState<'qr' | 'code'>('qr');
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState<string | null>(null);

  const fetchSession = async () => {
    try {
      const r = await api.getSession() as { data: { state?: string; status?: string } };
      const s = r.data?.state || r.data?.status || 'UNKNOWN';
      sessionStore.getState().setState(s);
    } catch {
      sessionStore.getState().setState('STOPPED');
    }
  };

  const fetchQr = async () => {
    setLoading(true);
    setErr('');
    try {
      // Check session state first — if already WORKING, no QR needed
      const s = await api.getSession() as { data: { state?: string; status?: string } };
      const state = s.data?.state || s.data?.status || 'UNKNOWN';
      sessionStore.getState().setState(state);
      if (state === 'WORKING') { setQr(null); return; }

      const r = (await api.getQR()) as { data: string | { qr: string; image?: string } };
      let v: string | null = null;
      if (typeof r.data === 'string') v = r.data;
      else if (r.data && typeof r.data === 'object') v = (r.data as any).qr || (r.data as any).image || null;
      if (v && !v.startsWith('data:') && !v.startsWith('http') && !v.startsWith('<svg')) {
        if (v.length > 100 && !v.includes(' ')) v = 'data:image/png;base64,' + v;
      }
      if (v) setQr(v);
      else setErr('QR belum tersedia, klik Start untuk memulai session');
    } catch (e) {
      const msg = String(e).replace(/^Error:\s*/, '');
      if (msg.includes('WORKING')) {
        // Already connected
        sessionStore.getState().setState('WORKING');
        setQr(null);
      } else if (msg.includes('500') || msg.includes('Unable to connect') || msg.includes('fetch failed')) {
        setErr('WAHA gateway tidak berjalan. Pastikan WAHA sudah start di port 3000.');
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const start = async () => {
    setLoading(true);
    setErr('');
    try {
      await api.startSession();
      await fetchSession();
      await new Promise(r => setTimeout(r, 2000));
      await fetchQr();
    } catch (e) {
      const msg = String(e).replace(/^Error:\s*/, '');
      if (msg.includes('500') || msg.includes('Unable to connect') || msg.includes('fetch failed')) {
        setErr('WAHA gateway tidak berjalan. Pastikan WAHA sudah start di port 3000.');
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const stop = async () => {
    setLoading(true);
    setErr('');
    try {
      await api.stopSession();
      await fetchSession();
      setQr(null);
    } catch (e) {
      const msg = String(e).replace(/^Error:\s*/, '');
      if (msg.includes('500') || msg.includes('Unable to connect') || msg.includes('fetch failed')) {
        setErr('WAHA gateway tidak berjalan.');
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const getCode = async () => {
    const d = phone.replace(/\D/g, '').replace(/^0+/, '');
    if (!d.startsWith('8') || d.length < 9 || d.length > 13) {
      setErr('Masukkan 8xxxxx 9-13 digit');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const r = (await api.requestPairingCode(`62${d}`)) as {
        data: { code: string } | string;
      };
      const c =
        typeof r.data === 'string'
          ? r.data
          : (r.data as { code: string }).code;
      setCode(c);
    } catch (e) {
      setErr(String(e).replace(/^Error:\s*/, ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    // Don't auto-fetch QR — only after user clicks Start
  }, []);

  useEffect(() => {
    if (sessionState === 'WORKING') { setQr(null); return; }
    // Only poll after STARTING, not when STOPPED/UNKNOWN
    if (tab === 'qr' && (sessionState === 'STARTING' || sessionState === 'SCAN_QR_CODE')) {
      const id = setInterval(fetchQr, 3000);
      return () => clearInterval(id);
    }
  }, [tab, sessionState]);

  const phoneValid = (() => {
    const d = phone.replace(/\D/g, '').replace(/^0+/, '');
    return d.startsWith('8') && d.length >= 9 && d.length <= 13;
  })();

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Bar */}
        <div className="modal-bar" />

        {/* Header */}
        <div className="modal-header">
          <span className="modal-title">Connect WhatsApp</span>
          <button className="modal-close" onClick={close} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${tab === 'qr' ? 'modal-tab-active' : ''}`}
            onClick={() => setTab('qr')}
          >
            QR Code
          </button>
          <button
            className={`modal-tab ${tab === 'code' ? 'modal-tab-active' : ''}`}
            onClick={() => setTab('code')}
          >
            Pairing Code
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {sessionState === 'WORKING' ? (
            <ConnectedState
              onDisconnect={async () => {
                await api.stopSession().catch(() => {});
                close();
              }}
            />
          ) : tab === 'qr' ? (
            <QRTab
              qr={qr}
              loading={loading}
              err={err}
              sessionState={sessionState}
              onStart={start}
              onRefresh={fetchQr}
              onStop={stop}
            />
          ) : (
            <CodeTab
              phone={phone}
              phoneValid={phoneValid}
              code={code}
              loading={loading}
              err={err}
              onPhoneChange={(v) => setPhone(v.replace(/\D/g, ''))}
              onRequest={getCode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Connected ── */
function ConnectedState({ onDisconnect }: { onDisconnect: () => void }) {
  return (
    <div className="text-center" style={{ padding: '16px 0' }}>
      <div className="connect-success-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>
      </div>
      <div className="connect-success-title">Connected</div>
      <div className="connect-success-desc">WhatsApp linked</div>
      <button
        className="modal-btn modal-btn-secondary"
        style={{ marginTop: 16, width: '100%' }}
        onClick={onDisconnect}
      >
        Disconnect
      </button>
    </div>
  );
}

/* ── QR Tab ── */
function QRTab({
  qr,
  loading,
  err,
  sessionState,
  onStart,
  onRefresh,
  onStop,
}: {
  qr: string | null;
  loading: boolean;
  err: string;
  sessionState: string;
  onStart: () => void;
  onRefresh: () => void;
  onStop: () => void;
}) {
  return (
    <div className="text-center">
      {loading && !qr ? (
        /* Loading */
        <div
          className="flex flex-col items-center gap-3"
          style={{ padding: '40px 0' }}
        >
          <div className="modal-spinner" />
          <span
            className="text-[12px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Loading QR...
          </span>
        </div>
      ) : qr ? (
        /* QR displayed */
        <>
          <div className="qr-wrapper" style={{ background: '#fff', padding: 12, borderRadius: 12, display: 'inline-block' }}>
            {qr.startsWith('<svg') ? <div dangerouslySetInnerHTML={{__html: qr}} style={{width:256,height:256}}/> : <img src={qr} alt="QR Code" style={{ width: 256, height: 256, objectFit: 'contain' }} />}
          </div>
          <div className="qr-hint">
            Scan with WhatsApp &gt; Linked devices
          </div>
          <div className="flex gap-2" style={{ marginTop: 16 }}>
            <button
              className="modal-btn modal-btn-secondary flex-1"
              onClick={onStart}
              disabled={loading}
            >
              Start
            </button>
            <button
              className="modal-btn modal-btn-primary flex-1"
              onClick={onRefresh}
              disabled={loading}
            >
              Refresh
            </button>
            <button
              className="modal-btn flex-1"
              style={{ background: 'rgba(234,67,53,0.12)', color: 'var(--danger)', border: '1px solid rgba(234,67,53,0.2)' }}
              onClick={onStop}
              disabled={loading}
            >
              Stop
            </button>
          </div>
        </>
      ) : (
        /* No QR */
        <>
          <div
            className="text-[13px]"
            style={{ color: 'var(--text-secondary)', padding: '32px 0' }}
          >
            No QR yet
          </div>
          <button
            className="modal-btn modal-btn-primary"
            style={{ width: '100%' }}
            onClick={onStart}
            disabled={loading}
          >
            {loading ? 'Starting...' : 'Start session'}
          </button>
        </>
      )}

      {err && (
        <div className="modal-error">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{err}</span>
        </div>
      )}

      <div className="modal-debug">State: {sessionState}</div>
    </div>
  );
}

/* ── Pairing Code Tab ── */
function CodeTab({
  phone,
  phoneValid,
  code,
  loading,
  err,
  onPhoneChange,
  onRequest,
}: {
  phone: string;
  phoneValid: boolean;
  code: string | null;
  loading: boolean;
  err: string;
  onPhoneChange: (v: string) => void;
  onRequest: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Phone input */}
      <div>
        <label
          className="block text-[11px] font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          Phone number
        </label>
        <div className="phone-row">
          <span className="phone-prefix">+62</span>
          <input
            className="phone-input"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="8xxxxxxxxxx"
          />
        </div>
        <div
          className={`phone-hint ${phone && !phoneValid ? 'phone-hint-error' : ''}`}
        >
          {phone && !phoneValid
            ? 'Masukkan 8xxxxx 9-13 digit'
            : 'Fixed +62, input 8xxxxx'}
        </div>
      </div>

      {/* Request button */}
      <button
        className={`modal-btn ${phoneValid ? 'modal-btn-primary' : 'modal-btn-secondary'}`}
        style={{ width: '100%' }}
        onClick={onRequest}
        disabled={!phoneValid || loading}
      >
        {loading ? 'Requesting...' : 'Get pairing code'}
      </button>

      {/* Code display */}
      {code && (
        <div className="pairing-card">
          <div className="pairing-label">Pairing code</div>
          <div className="pairing-code">{code}</div>
          <div className="pairing-hint">
            Enter in WhatsApp &gt; Link with phone number
          </div>
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="modal-error">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{err}</span>
        </div>
      )}
    </div>
  );
}