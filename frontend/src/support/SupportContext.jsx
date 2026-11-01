/** Shared sessions, live inbox, presence, per-admin mute preferences, and arrival sounds. */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { disableNotifications } from './notifications';
import { useInstallShortcut } from './useInstallShortcut';
import { updateDeviceBadge } from './appBadge';
import { useNotificationStatus } from './useNotificationStatus';
import { useMessageSound } from './useMessageSound';
import { API_BASE, currentCsrf, request, session } from './api';
const Context = createContext(null);
export const useSupport = () => useContext(Context);
export default function SupportProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [connected, setConnected] = useState(false);
  const [conversations, setConversations] = useState([]); const [unreadTotal, setUnreadTotal] = useState(null); const [nextInbox, setNextInbox] = useState(null);
  const [inboxFilter, setInboxFilter] = useState('all'); const [supportPresence, setSupportPresence] = useState(null);
  const [customerPresence, setCustomerPresence] = useState({}); const [socket, setSocket] = useState(null);
  const socketRef = useRef(null); const refreshTimer = useRef(null); const muted = useRef(new Set());
  const install = useInstallShortcut(user);
  const notifications = useNotificationStatus(user);
  const sound = useMessageSound(); const soundRef = useRef(sound); soundRef.current = sound;
  const filterRef = useRef(inboxFilter); filterRef.current = inboxFilter;
  const refresh = useCallback(async (append = false, cursor = null) => {
    const filter = filterRef.current; const params = new URLSearchParams({ filter }); if (cursor) params.set('before', cursor);
    const data = await request(`/conversations?${params}`); if (filterRef.current !== filter) return;
    setConversations(previous => append ? [...previous, ...data.conversations.filter(c => !previous.some(p => p.id === c.id))] : data.conversations);
    setUnreadTotal(Number.isSafeInteger(data.unreadTotal) ? data.unreadTotal : data.conversations.reduce((total, c) => total + c.unread, 0));
    muted.current = new Set(data.mutedConversationIds || []); setNextInbox(data.next);
  }, []);
  useEffect(() => {
    let active = true;
    session().then(data => { if (active) setUser(data.user); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => { if (user) refresh().catch(e => setError(e.message)); }, [inboxFilter, user?.id, refresh]);
  useEffect(() => {
    if (!user) { setUnreadTotal(null); setConversations([]); setCustomerPresence({}); setSupportPresence(null); return; }
    request('/presence').then(data => setSupportPresence(data.support)).catch(() => {});
    const live = io(API_BASE, { withCredentials: true, auth: { csrf: currentCsrf() } }); socketRef.current = live; setSocket(live);
    const activity = () => live.emit('presence:activity', { visible: !document.hidden && document.hasFocus() });
    live.on('connect', () => { setConnected(true); activity(); refresh().catch(() => {}); });
    live.on('disconnect', reason => { setConnected(false); if (reason === 'io server disconnect') setError('Your session ended. Please log in again.'); });
    live.on('connect_error', e => { setConnected(false); if (/log in|Session/i.test(e.message)) setError('Session expired. Please log in again.'); });
    const schedule = () => { clearTimeout(refreshTimer.current); refreshTimer.current = setTimeout(() => refresh().catch(() => {}), 200); };
    const seen = new Set();
    live.on('chat:message', message => {
      if (!seen.has(message.id)) {
        seen.add(message.id); if (seen.size > 500) seen.delete(seen.values().next().value);
        if (message.senderId !== user.id && !muted.current.has(message.conversationId)) soundRef.current.playMessageTone();
      } schedule();
    });
    ['chat:customer', 'chat:read', 'chat:conversation', 'chat:updated', 'chat:hidden', 'chat:preference'].forEach(event => live.on(event, schedule));
    live.on('chat:presence', person => {
      if (person.role === 'admin') setSupportPresence(person);
      else {
        setCustomerPresence(p => ({ ...p, [person.userId]: person }));
        setConversations(p => p.map(c => c.customer?.id === person.userId ? { ...c, customer: { ...c.customer, ...person } } : c));
      }
    });
    const visible = () => { activity(); if (!document.hidden) refresh().catch(() => {}); };
    document.addEventListener('visibilitychange', visible); window.addEventListener('focus', visible); window.addEventListener('blur', activity);
    const push = event => { if (event.data?.type === 'neptrixx:push') refresh().catch(() => {}); };
    navigator.serviceWorker?.addEventListener?.('message', push);
    const timer = setInterval(activity, 25000);
    return () => { clearTimeout(refreshTimer.current); clearInterval(timer); navigator.serviceWorker?.removeEventListener?.('message', push); live.disconnect(); socketRef.current = null; setSocket(null);
      setConnected(false); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible); window.removeEventListener('blur', activity); };
  }, [user?.id, refresh]);
  async function logout() {
    await disableNotifications().catch(() => {});
    await updateDeviceBadge(0);
    await request('/auth/logout', { method: 'POST' }); setUser(null); window.location.assign('/messages');
  }
  useEffect(() => {
    if (loading) return;
    if (!user) updateDeviceBadge(0); else if (unreadTotal !== null) updateDeviceBadge(unreadTotal);
  }, [loading, user?.id, unreadTotal]);
  const unread = unreadTotal ?? conversations.reduce((total, c) => total + c.unread, 0);
  return <Context.Provider value={{ user, setUser, loading, error, setError, connected, socketRef, socket,
    conversations, refresh, nextInbox, unread, logout, inboxFilter, setInboxFilter, supportPresence, customerPresence, install, ...notifications, ...sound }}>{children}</Context.Provider>;
}
