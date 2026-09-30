import { useEffect, useState } from 'react';
import { contactStore } from '../stores/contactStore';
import { chatStore } from '../stores/chatStore';
import { uiStore } from '../stores/uiStore';
import Avatar from './Avatar';

export default function NewChatModal() {
  const closeModal = uiStore((s) => s.closeModal);
  const { contacts, loading, loadContacts } = contactStore();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'contacts' | 'phone'>('contacts');
  const [phone, setPhone] = useState('');

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const filtered = search
    ? contacts.filter(c => (c.push_name || c.phone || c.jid).toLowerCase().includes(search.toLowerCase()))
    : contacts;

  const handleSelect = (jid: string) => {
    chatStore.getState().selectChat(jid);
    closeModal();
  };

  const handlePhoneChat = () => {
    const digits = phone.replace(/\D/g, '').replace(/^0+/, '');
    if (!digits.startsWith('8') || digits.length < 9 || digits.length > 13) return;
    const jid = `62${digits}@s.whatsapp.net`;
    handleSelect(jid);
  };

  const phoneValid = (() => {
    const d = phone.replace(/\D/g, '').replace(/^0+/, '');
    return d.startsWith('8') && d.length >= 9 && d.length <= 13;
  })();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
      <div className="w-[420px] max-h-[75vh] rounded-2xl overflow-hidden glass elevated flex flex-col" style={{ background: 'rgba(32,44,51,0.96)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-[15px] font-semibold">New chat</span>
          <button onClick={closeModal} className="btn-icon w-8 h-8" style={{ color: 'var(--text-secondary)' }} aria-label="Close">✕</button>
        </div>

        <div className="flex gap-1 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setTab('contacts')} className={`flex-1 py-2 rounded-xl text-[13px] font-medium transition-colors ${tab === 'contacts' ? 'text-white' : ''}`} style={{ background: tab === 'contacts' ? 'var(--accent)' : 'var(--panel-hover)', color: tab === 'contacts' ? '#fff' : 'var(--text-secondary)' }}>Contacts</button>
          <button onClick={() => setTab('phone')} className={`flex-1 py-2 rounded-xl text-[13px] font-medium transition-colors ${tab === 'phone' ? 'text-white' : ''}`} style={{ background: tab === 'phone' ? 'var(--accent)' : 'var(--panel-hover)', color: tab === 'phone' ? '#fff' : 'var(--text-secondary)' }}>Phone number</button>
        </div>

        {tab === 'contacts' ? (
          <>
            <div className="px-3 py-2.5">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-8 py-2.5 rounded-xl text-[13px] outline-none transition-all" style={{ background: 'var(--panel-hover)', color: 'var(--text)', border: '1px solid transparent' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; }} autoFocus />
                {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>✕</button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {loading ? (
                <div className="space-y-2 p-2">
                  {[0,1,2].map(i => <div key={i} className="h-[56px] rounded-xl shimmer" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--panel-hover)', border: '1px solid var(--border)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-secondary)" className="opacity-60"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                  </div>
                  <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>No contacts found</div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((c) => (
                    <div key={c.jid} onClick={() => handleSelect(c.jid)} className="px-3 py-2.5 flex items-center gap-3 cursor-pointer rounded-xl hover:bg-white/[0.04] transition-colors">
                      <Avatar name={c.push_name || c.phone || c.jid} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-medium truncate">{c.push_name || c.phone || c.jid}</div>
                        <div className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{c.jid}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Phone number</label>
              <div className="flex items-center gap-2">
                <div className="px-3 py-2.5 rounded-xl text-[13px] font-medium flex-shrink-0" style={{ background: 'var(--panel-hover)', border: '1px solid var(--border)', color: 'var(--text)' }}>+62</div>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="8xxxxxxxxxx" className="flex-1 px-3 py-2.5 rounded-xl text-[13px] outline-none transition-all" style={{ background: 'var(--panel-hover)', color: 'var(--text)', border: '1px solid transparent' }} onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'} onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'} autoFocus />
              </div>
              <div className="text-[11px] mt-2" style={{ color: phone && !phoneValid ? 'var(--danger)' : 'var(--text-secondary)' }}>
                {phone && !phoneValid ? 'Masukkan 8xxxxx (9-13 digit, awali 8)' : 'Fixed +62, tinggal input 8xxxxx'}
              </div>
            </div>
            <button onClick={handlePhoneChat} disabled={!phoneValid} className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40 active:scale-[0.98]" style={{ background: phoneValid ? 'var(--accent)' : 'var(--panel-hover)', color: phoneValid ? '#fff' : 'var(--text-secondary)' }}>Start chat</button>
            <div className="text-[11px] text-center" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>JID: 62{phone || '8xxxxxxxxxx'}@s.whatsapp.net</div>
          </div>
        )}
      </div>
    </div>
  );
}
