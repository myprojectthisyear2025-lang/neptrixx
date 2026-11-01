/** History, optimistic send/retry, reconnection recovery, read receipts, and typing state. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from './api';
import { useSupport } from './SupportContext';
function merge(previous, incoming) {
  const next = [...previous];
  for (const message of incoming) {
    const i = next.findIndex(m => m.id === message.id || m.clientId === message.clientId && m.senderId === message.senderId);
    if (i >= 0) { if ((message.revision || 0) >= (next[i].revision || 0)) next[i] = message; } else next.push(message);
  }
  return next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id.localeCompare(b.id));
}
export function useThread(conversation, onConversation) {
  const { user, socket, refresh } = useSupport(); const id = conversation?.id;
  const [messages, setMessages] = useState([]); const [profileCard, setProfileCard] = useState(null); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); const [hasMore, setHasMore] = useState(false);
  const [typing, setTyping] = useState(false); const active = useRef(id); active.current = id;
  const synced = useRef(null); const hidden = useRef(new Set()); const typingTimer = useRef(null); const list = useRef(messages); list.current = messages;
  const onConversationRef = useRef(onConversation); onConversationRef.current = onConversation;
  const markRead = useCallback(async message => {
    if (document.hidden || !document.hasFocus() || !message || message.pending || message.failed || active.current !== id) return;
    try { await request(`/conversations/${id}/read`, { method: 'POST', body: { messageId: message.id } }); }
    catch { /* next focus or message retries read acknowledgment */ }
  }, [id]);
  const load = useCallback(async (older = false) => {
    if (!id) return; setLoading(true); setError('');
    const first = list.current.find(m => !m.pending && !m.failed);
    try {
      const params = new URLSearchParams();
      if (older && first) params.set('before', first.id);
      if (first && synced.current) { params.set('loadedFrom', first.id); params.set('changedSince', synced.current); }
      const data = await request(`/conversations/${id}/messages?${params}`);
      if (active.current !== id) return;
      setProfileCard(user.role === 'admin' ? data.profileCard || null : null);
      for (const removed of data.hiddenIds || []) hidden.current.add(removed);
      synced.current = data.syncAt || synced.current;
      setMessages(p => merge(p.filter(m => !hidden.current.has(m.id) && (!data.hiddenBefore || new Date(m.createdAt) > new Date(data.hiddenBefore)) &&
        (!data.reset || m.pending || m.failed || new Date(m.createdAt) >= new Date(data.syncAt))),
        [...data.messages, ...(data.updates || [])].filter(m => !hidden.current.has(m.id))));
      if (older || data.reset || !list.current.length) setHasMore(data.hasMore);
      onConversationRef.current(data.conversation);
      if (!older) markRead(data.messages.at(-1));
    } catch (e) { if (active.current === id) setError(e.message); }
    finally { if (active.current === id) setLoading(false); }
  }, [id, markRead]);
  useEffect(() => {
    setMessages([]); setProfileCard(null); hidden.current.clear(); synced.current = null; list.current = []; setHasMore(false); setTyping(false); load();
    return () => clearTimeout(typingTimer.current);
  }, [id, load]);
  useEffect(() => {
    const receive = message => {
      if (message.conversationId !== id || hidden.current.has(message.id)) return;
      setMessages(p => merge(p, [message])); markRead(message);
    };
    const hide = data => { if (data.conversationId === id) { hidden.current.add(data.messageId); setMessages(p => p.filter(m => m.id !== data.messageId)); } };
    const preference = data => { if (data.conversationId === id && data.deleted) { setMessages([]); list.current = []; load(); } };
    const updated = message => { if (message.conversationId === id && !hidden.current.has(message.id)) setMessages(p => merge(p, [message])); };
    const read = data => { if (data.conversationId === id) onConversationRef.current(c => ({ ...c, [data.field]: data.at })); };
    const type = data => {
      if (data.conversationId !== id || data.role === user.role) return;
      setTyping(data.active); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTyping(false), 2500);
    };
    const reconnect = () => load();
    const focus = () => { if (!document.hidden) load(); };
    socket?.on('chat:updated', updated); socket?.on('chat:hidden', hide); socket?.on('chat:preference', preference);
    socket?.on('chat:message', receive); socket?.on('chat:read', read); socket?.on('chat:typing', type); socket?.on('connect', reconnect);
    document.addEventListener('visibilitychange', focus); window.addEventListener('focus', focus);
    // Refresh expiring private image URLs while this conversation remains open.
    const timer = setInterval(() => load(), 12 * 60000);
    return () => { socket?.off('chat:updated', updated); socket?.off('chat:hidden', hide); socket?.off('chat:preference', preference);
      socket?.off('chat:message', receive); socket?.off('chat:read', read); socket?.off('chat:typing', type);
      socket?.off('connect', reconnect); document.removeEventListener('visibilitychange', focus); window.removeEventListener('focus', focus); clearInterval(timer); };
  }, [id, user.role, socket, load, markRead]);
  async function send(input) {
    const clientId = input.clientId || crypto.randomUUID();
    const optimistic = { ...input, id: `pending-${clientId}`, clientId, senderId: user.id, senderRole: user.role,
      conversationId: id, createdAt: input.createdAt || new Date().toISOString(), pending: true, failed: false };
    setMessages(p => merge(p, [optimistic])); setError('');
    try {
      const data = await request(`/conversations/${id}/messages`, { method: 'POST', body: {
        clientId, text: input.text, imageKey: input.imageKey || '', replyTo: input.replyTo || null,
      } });
      if (active.current === id) { setMessages(p => merge(p, [data.message])); markRead(data.message); }
      refresh().catch(() => {});
    } catch (e) {
      if (active.current === id) { setMessages(p => p.map(m => m.clientId === clientId && (m.pending || m.failed) ? { ...optimistic, pending: false, failed: true } : m));
        if (!list.current.some(m => m.clientId === clientId && !m.pending && !m.failed)) setError(e.message); }
    }
  }
  async function action(message, action, extra = {}) {
    const data = await request(`/conversations/${id}/messages/${message.id}`, { method: 'PATCH', body: { action, ...extra } });
    if (data.hidden) { hidden.current.add(message.id); setMessages(p => p.filter(m => m.id !== message.id)); }
    else setMessages(p => merge(p, [data.message]));
    refresh().catch(() => {});
  }
  return { profileCard, action, messages, loading, error, hasMore, typing, load, send };
}
