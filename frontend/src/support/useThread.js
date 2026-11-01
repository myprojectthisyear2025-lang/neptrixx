/** History, optimistic send/retry, reconnection recovery, read receipts, and typing state. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from './api';
import { useSupport } from './SupportContext';
function merge(previous, incoming) {
  const next = [...previous];
  for (const message of incoming) {
    const i = next.findIndex(m => m.id === message.id || m.clientId === message.clientId && m.senderId === message.senderId);
    if (i >= 0) next[i] = message; else next.push(message);
  }
  return next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id.localeCompare(b.id));
}
export function useThread(conversation, onConversation) {
  const { user, socket, refresh } = useSupport(); const id = conversation?.id;
  const [messages, setMessages] = useState([]); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); const [hasMore, setHasMore] = useState(false);
  const [typing, setTyping] = useState(false); const active = useRef(id); active.current = id;
  const typingTimer = useRef(null); const list = useRef(messages); list.current = messages;
  const onConversationRef = useRef(onConversation); onConversationRef.current = onConversation;
  const markRead = useCallback(async message => {
    if (document.hidden || !message || message.pending || message.failed || active.current !== id) return;
    try { await request(`/conversations/${id}/read`, { method: 'POST', body: { messageId: message.id } }); }
    catch { /* next focus or message retries read acknowledgment */ }
  }, [id]);
  const load = useCallback(async (older = false) => {
    if (!id) return; setLoading(true); setError('');
    const first = list.current.find(m => !m.pending && !m.failed);
    try {
      const data = await request(`/conversations/${id}/messages${older && first ? `?before=${first.id}` : ''}`);
      if (active.current !== id) return;
      setMessages(p => merge(p, data.messages));
      if (older || !list.current.length) setHasMore(data.hasMore);
      onConversationRef.current(data.conversation);
      if (!older) markRead(data.messages.at(-1));
    } catch (e) { if (active.current === id) setError(e.message); }
    finally { if (active.current === id) setLoading(false); }
  }, [id, markRead]);
  useEffect(() => {
    setMessages([]); list.current = []; setHasMore(false); setTyping(false); load();
    return () => clearTimeout(typingTimer.current);
  }, [id, load]);
  useEffect(() => {
    const receive = message => {
      if (message.conversationId !== id) return;
      setMessages(p => merge(p, [message])); markRead(message);
    };
    const read = data => { if (data.conversationId === id) onConversationRef.current(c => ({ ...c, [data.field]: data.at })); };
    const type = data => {
      if (data.conversationId !== id || data.role === user.role) return;
      setTyping(data.active); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTyping(false), 2500);
    };
    const reconnect = () => load();
    const focus = () => { if (!document.hidden) load(); };
    socket?.on('chat:message', receive); socket?.on('chat:read', read); socket?.on('chat:typing', type); socket?.on('connect', reconnect);
    document.addEventListener('visibilitychange', focus);
    // Refresh expiring private image URLs while this conversation remains open.
    const timer = setInterval(() => load(), 12 * 60000);
    return () => { socket?.off('chat:message', receive); socket?.off('chat:read', read); socket?.off('chat:typing', type);
      socket?.off('connect', reconnect); document.removeEventListener('visibilitychange', focus); clearInterval(timer); };
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
  return { messages, loading, error, hasMore, typing, load, send };
}
