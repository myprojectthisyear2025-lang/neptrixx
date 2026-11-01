/** Shared login, live notifications, inbox unread counts, and connection feedback. */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { disableNotifications } from './notifications';
import { API_BASE, currentCsrf, request, session } from './api';
const Context = createContext(null);
export const useSupport = () => useContext(Context);
export default function SupportProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [connected, setConnected] = useState(false);
  const [conversations, setConversations] = useState([]); const [nextInbox, setNextInbox] = useState(null);
  const [socket, setSocket] = useState(null); const socketRef = useRef(null); const refreshTimer = useRef(null);
  const refresh = useCallback(async (append = false, cursor = null) => {
    const data = await request(`/conversations${cursor ? `?before=${cursor}` : ''}`);
    setConversations(previous => append ? [...previous, ...data.conversations.filter(c => !previous.some(p => p.id === c.id))] : data.conversations);
    setNextInbox(data.next);
  }, []);
  useEffect(() => {
    let active = true;
    session().then(data => { if (active) setUser(data.user); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!user) { setConversations([]); return; }
    refresh().catch(e => setError(e.message));
    const socket = io(API_BASE, { withCredentials: true, auth: { csrf: currentCsrf() } }); socketRef.current = socket; setSocket(socket);
    socket.on('connect', () => { setConnected(true); refresh().catch(() => {}); });
    socket.on('disconnect', reason => { setConnected(false); if (reason === 'io server disconnect') setError('Your session ended. Please log in again.'); });
    socket.on('connect_error', e => { setConnected(false); if (/log in|Session/i.test(e.message)) setError('Session expired. Please log in again.'); });
    const schedule = () => { clearTimeout(refreshTimer.current); refreshTimer.current = setTimeout(() => refresh().catch(() => {}), 200); };
    socket.on('chat:message', schedule); socket.on('chat:read', schedule); socket.on('chat:conversation', schedule);
    const visible = () => { if (!document.hidden) refresh().catch(() => {}); };
    document.addEventListener('visibilitychange', visible);
    return () => { clearTimeout(refreshTimer.current); socket.disconnect(); socketRef.current = null;
      setConnected(false); document.removeEventListener('visibilitychange', visible); };
  }, [user?.id, refresh]);
  async function logout() {
    await disableNotifications().catch(() => {});
    await request('/auth/logout', { method: 'POST' }); setUser(null); window.location.assign('/messages');
  }
  const unread = conversations.reduce((total, c) => total + c.unread, 0);
  return <Context.Provider value={{ user, setUser, loading, error, setError, connected, socketRef, socket,
    conversations, refresh, nextInbox, unread, logout }}>{children}</Context.Provider>;
}
