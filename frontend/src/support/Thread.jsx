/** One conversation window, adapted from the mobile header/list/composer composition. */
import { useState } from 'react';
import { useSupport } from './SupportContext';
import { useThread } from './useThread';
import { request } from './api';
import Presence from './Presence';
import Avatar from './Avatar';
import Composer from './Composer';
import MessageList from './MessageList';
import Modal from './Modal';
export default function Thread({ conversation, setConversation, onBack }) {
  const { user, connected, refresh, conversations, supportPresence, customerPresence } = useSupport(); const [reply, setReply] = useState(null);
  const [photo, setPhoto] = useState(''); const [details, setDetails] = useState(false); const [error, setError] = useState('');
  const [busy, setBusy] = useState(false); const thread = useThread(conversation, setConversation);
  const isAdmin = user.role === 'admin';
  const customer = conversations.find(c => c.id === conversation.id)?.customer || conversation.customer;
  const person = isAdmin ? { ...customer, ...customerPresence[customer?.id] } : supportPresence;
  async function status() {
    setBusy(true); setError('');
    try { const data = await request(`/admin/conversations/${conversation.id}`, { method: 'PATCH', body: { status: conversation.status === 'resolved' ? 'open' : 'resolved' } });
      setConversation(data.conversation); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function restrict() {
    setBusy(true); setError('');
    try { const data = await request(`/admin/customers/${conversation.customer.id}`, { method: 'PATCH', body: { blocked: !customer.blocked } });
      setConversation(c => ({ ...c, customer: data.customer })); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="sp-thread" aria-label="Chat">
    <header className="sp-thread-head">
      {isAdmin && <button className="sp-back" onClick={onBack} aria-label="Back to inbox">←</button>}
      <Avatar business={!isAdmin} user={isAdmin ? conversation.customer : null} />
      <div className="sp-thread-title"><h2>{isAdmin ? conversation.customer?.name || 'Customer' : 'Neptrixx Support'}</h2>
        {connected ? <Presence person={person} /> : <p>Reconnecting…</p>}</div>
      {isAdmin && <><button className="sp-resolve" disabled={busy} onClick={status}>{conversation.status === 'resolved' ? 'Reopen' : 'Resolve'}</button><button onClick={() => setDetails(true)}>Details</button></>}
    </header>
    {conversation.status === 'resolved' && <p className="sp-status-banner">Resolved. Sending a new message reopens this conversation.</p>}
    {customer?.blocked && <p className="sp-status-banner">This account is restricted.</p>}
    {(error || thread.error) && <div className="sp-error" role="alert">{error || thread.error} <button onClick={() => thread.load()}>Reload</button></div>}
    <MessageList thread={thread} user={user} conversation={conversation} onReply={setReply} onPhoto={setPhoto} />
    {!customer?.blocked && <Composer key={conversation.id} conversation={conversation} onSend={thread.send} reply={reply && thread.messages.find(m => m.id === reply.id && !m.deletedForAll)} clearReply={() => setReply(null)} />}
    {photo && <Modal title="Shared photo" wide onClose={() => setPhoto('')}><img className="sp-full-photo" src={photo} alt="Shared photo" /></Modal>}
    {details && <Modal title="Customer details" onClose={() => setDetails(false)}>
      <dl className="sp-details">{[['Name', conversation.customer?.name], ['Email', conversation.customer?.email], ['Phone', conversation.customer?.phone || 'Not provided'],
        ['Customer ID', conversation.customer?.id]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="sp-muted">Restricting an account ends its sessions and prevents further access or messages.</p>
      <button className="sp-danger" disabled={busy} onClick={restrict}>{customer?.blocked ? 'Restore account access' : 'Restrict account'}</button>
      {error && <p className="sp-error" role="alert">{error}</p>}
    </Modal>}
  </section>;
}
