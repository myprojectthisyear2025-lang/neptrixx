/** Admin inbox plus private customer search, including customers without a conversation. */
import { useEffect, useState } from 'react';
import { request } from './api';
import { useSupport } from './SupportContext';
import InboxRow from './InboxRow';
import InboxMenu from './InboxMenu';
import Avatar from './Avatar';
export default function Inbox({ selected, onSelect }) {
  const { conversations, refresh, nextInbox, inboxFilter, setInboxFilter } = useSupport(); const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(null); const [customers, setCustomers] = useState(null);
  const [nextCustomer, setNextCustomer] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!query.trim()) { setCustomers(null); setError(''); return; }
    let active = true; const timer = setTimeout(() => {
      setBusy(true);
      request(`/admin/customers?q=${encodeURIComponent(query.trim())}`).then(data => {
        if (active) { setCustomers(data.customers); setNextCustomer(data.next); setError(''); }
      }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); });
    }, 300); return () => { active = false; clearTimeout(timer); };
  }, [query]);
  async function openCustomer(customer) {
    setBusy(true); setError('');
    try { const data = await request(`/admin/customers/${customer.id}/conversation`, { method: 'POST' }); onSelect(data.conversation); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function more() {
    setBusy(true); setError('');
    try {
      if (customers) { const data = await request(`/admin/customers?q=${encodeURIComponent(query.trim())}&before=${nextCustomer}`);
        setCustomers(p => [...p, ...data.customers]); setNextCustomer(data.next); }
      else await refresh(true, nextInbox);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const visible = [...conversations].sort((a, b) => Number(!!b.pinnedAt) - Number(!!a.pinnedAt) || new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
  return <aside className="sp-inbox">
    <div className="sp-inbox-head"><h1>Messages</h1><p className="sp-muted">Your customer conversations</p>
      <label className="sp-search"><span className="sp-sr-only">Search customers</span><input type="search" value={query} placeholder="Search name, email, phone, ID"
        onChange={e => setQuery(e.target.value)} /></label>
      {!query.trim() && <div className="sp-filters">{['all', 'unread', 'muted', 'blocked', 'pinned'].map(value => <button key={value}
        className={inboxFilter === value ? 'is-active' : ''} onClick={() => setInboxFilter(value)}>{value === 'blocked' ? 'Blocked users' : value[0].toUpperCase() + value.slice(1)}</button>)}</div>}
    </div>
    {error && <p className="sp-error" role="alert">{error}</p>}
    <div className="sp-inbox-list">
      {customers ? <>{customers.map(customer => <button className="sp-inbox-item" key={customer.id} disabled={busy} onClick={() => openCustomer(customer)}>
        <Avatar user={customer} /><span><strong>{customer.name}</strong><small>{customer.email}</small><small>{customer.blocked ? 'Restricted account' : 'Open conversation'}</small></span>
      </button>)}{!customers.length && <p className="sp-empty">No customers found.</p>}</> :
        visible.map(c => <InboxRow key={c.id} conversation={c} selected={selected?.id === c.id} onSelect={onSelect} onMenu={setMenu} />)}
      {!customers && !visible.length && <p className="sp-empty">{conversations.length ? 'No conversations in this view.' : 'No messages yet. Search for a customer to start.'}</p>}
      {(customers ? nextCustomer : nextInbox) && <button className="sp-history" disabled={busy} onClick={more}>Load more</button>}
      {busy && <p className="sp-empty" role="status">Loading…</p>}
    </div>
    {menu && <InboxMenu conversation={conversations.find(c => c.id === menu.id) || menu} onClose={() => setMenu(null)} onDeleted={id => { if (selected?.id === id) onSelect(null); }} />}
  </aside>;
}
