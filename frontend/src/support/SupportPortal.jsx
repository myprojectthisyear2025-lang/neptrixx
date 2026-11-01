// Neptrixx support portal and account navigation.
/** Responsive customer/admin support workspace, with minimal light/dark/system themes. */
import { useEffect, useState } from 'react';
import { useSupport } from './SupportContext';
import { useTheme } from './useTheme';
import { request } from './api';
import { enableNotifications } from './notifications';
import AuthForm from './AuthForm';
import Inbox from './Inbox';
import Thread from './Thread';
import Profile from './Profile';
import Avatar from './Avatar';
import './support.css';
import './messages.css';
export default function SupportPortal() {
  const { user, loading, error, setError, unread, logout } = useSupport(); const { theme, setTheme, mode } = useTheme();
  const [conversation, setConversation] = useState(null); const [profile, setProfile] = useState(false);
  const [starting, setStarting] = useState(false); const [notice, setNotice] = useState('');
  const isAdmin = user?.role === 'admin';
  async function start() {
    setStarting(true); setError('');
    try { const data = await request('/conversation', { method: 'POST' }); setConversation(data.conversation); }
    catch (e) { setError(e.message); } finally { setStarting(false); }
  }
  useEffect(() => {
    if (!user) return;
    if (isAdmin) {
      const id = new URLSearchParams(location.search).get('conversation');
      if (id && /^[a-f\d]{24}$/i.test(id)) request(`/conversations/${id}`).then(data => setConversation(data.conversation)).catch(e => setError(e.message));
      return;
    }
    let active = true; setStarting(true);
    request('/conversation', { method: 'POST' }).then(data => { if (active) setConversation(data.conversation); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setStarting(false); });
    return () => { active = false; };
  }, [user?.id, isAdmin, setError]);
  useEffect(() => { document.title = `${unread ? `(${unread}) ` : ''}${isAdmin ? 'Customer inbox' : 'Messages'} · Neptrixx`; }, [unread, isAdmin]);
  function selectConversation(c) {
    setConversation(c);
    if (isAdmin) history.replaceState(null, '', c ? `/admin/messages?conversation=${c.id}` : '/admin/messages');
  }
  async function notify() {
    setError(''); setNotice('');
    try { await enableNotifications(); setNotice('Notifications enabled on this device.'); } catch (e) { setError(e.message); }
  }
  return <div className="sp-app" data-theme={mode}>
    <header className="sp-topbar"><a className="sp-brand" href="/"><img src="/neptrixx-mark.svg" alt="" /><span>Neptrixx<small>{isAdmin ? 'Customer inbox' : 'Support'}</small></span></a>
      <div className="sp-top-actions"><label className="sp-theme"><span className="sp-sr-only">Appearance</span><select value={theme} onChange={e => setTheme(e.target.value)}>
        <option value="system">System theme</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
        {user && <button className="sp-account" aria-label="Account settings" onClick={() => setProfile(true)}><Avatar user={user} /><span>Account</span></button>}</div>
    </header>
    {loading ? <p className="sp-empty" role="status">Loading your account…</p> : !user ? <>
      {error && <p className="sp-error sp-global-error" role="alert">{error}</p>}<AuthForm />
    </> : <>
      <div className="sp-notification-bar"><span>Keep up with replies, even when you leave this page.</span><button onClick={notify}>Enable notifications</button></div>
      {error && <p className="sp-error sp-global-error" role="alert">{error} <button onClick={() => logout().catch(e => setError(e.message))}>Log out</button></p>}
      {notice && <p className="sp-notice sp-global-error" role="status">{notice}</p>}
      <main className={`sp-workspace ${isAdmin ? 'sp-admin' : 'sp-customer'} ${conversation ? 'has-thread' : ''}`}>
        {isAdmin && <Inbox selected={conversation} onSelect={selectConversation} />}
        {conversation ? <Thread key={conversation.id} conversation={conversation} setConversation={setConversation} onBack={() => selectConversation(null)} /> :
          <div className="sp-no-thread">{isAdmin ? <><span>↗</span><h1>Your conversations, together</h1><p>Choose a conversation or search for a customer.</p></> :
            <><h1>{starting ? 'Opening your conversation…' : 'Talk to Neptrixx'}</h1>{!starting && <button className="sp-primary" onClick={start}>Open conversation</button>}</>}</div>}
      </main>
    </>}
    {profile && user && <Profile onClose={() => setProfile(false)} />}
  </div>;
}
