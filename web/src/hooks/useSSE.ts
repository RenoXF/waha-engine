import { useEffect, useRef, useCallback } from 'react';
import { chatStore, Message } from '../stores/chatStore';
import { sessionStore } from '../stores/sessionStore';
import { authStore } from '../stores/authStore';

export function useSSE() {
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef(1000);

  const connect = useCallback(() => {
    const es = new EventSource('/sse/live', { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      retryRef.current = 1000;
    };

    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.message) chatStore.getState().addMessage(data.message as Message);
        chatStore.getState().loadChats();
      } catch {}
    });

    es.addEventListener('message_status', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.id && data?.status) {
          chatStore.getState().updateMessage(data.id, { status: data.status });
        }
      } catch {}
    });

    es.addEventListener('message_failed', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.messageId) {
          chatStore.getState().updateMessage(data.messageId, { status: 'failed' });
        }
      } catch {}
    });

    es.addEventListener('device_state', (e) => {
      try {
        const data = JSON.parse(e.data);
        sessionStore.getState().setState(data.state || 'UNKNOWN');
      } catch {}
    });

    es.addEventListener('chats', () => {
      chatStore.getState().loadChats();
    });

    es.addEventListener('reaction', (e) => {
      // Reload messages for current chat
      const { currentChat } = chatStore.getState();
      if (currentChat) chatStore.getState().selectChat(currentChat);
    });

    es.addEventListener('message_edited', (e) => {
      try {
        const data = JSON.parse(e.data);
        chatStore.getState().updateMessage(data.messageId, { body: data.text, is_edited: true });
      } catch {}
    });

    es.addEventListener('message_deleted', (e) => {
      try {
        const data = JSON.parse(e.data);
        chatStore.getState().updateMessage(data.messageId, { is_deleted: true, body: 'Pesan ini dihapus' });
      } catch {}
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setTimeout(() => {
        if (authStore.getState().user) connect();
      }, retryRef.current);
      retryRef.current = Math.min(retryRef.current * 2, 30000);
    };
  }, []);

  useEffect(() => {
    const unsub = authStore.subscribe((s) => {
      if (s.user && !esRef.current) {
        connect();
      } else if (!s.user && esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    });

    if (authStore.getState().user) connect();

    return () => {
      unsub();
      esRef.current?.close();
    };
  }, [connect]);
}
